import { deleteInstanceData, saveInstanceAgent } from "@/lib/instance-redis";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { instances } from "@/server/db/schema";
import type {
	InstanceCreateInput,
	InstanceStatus,
	InstanceUpdateInput,
} from "@/types";
import type { SessionStatus } from "@/types/api-responses";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { wahaApi } from "./waha-api";

// Helper function to map Waha status to Instance status
function mapWahaStatusToInstanceStatus(
	wahaStatus?: SessionStatus,
): InstanceStatus {
	switch (wahaStatus) {
		case "STARTING":
		case "SCAN_QR_CODE":
			return "connecting";
		case "RUNNING":
		case "WORKING": // Consider 'WORKING' as connected
			return "connected";
		// STOPPED and ERROR fall through to default
		default:
			return "disconnected";
	}
}

export const instancesRouter = createTRPCRouter({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const dbInstances = await ctx.db.query.instances.findMany({
			where: (instance, { eq }) =>
				eq(instance.createdById, ctx.session.user.id),
			orderBy: (instance, { desc }) => [desc(instance.createdAt)],
			with: {
				agent: true,
			},
		});

		// Fetch real-time status from Waha for each instance
		const enrichedInstances = await Promise.all(
			dbInstances.map(async (instance) => {
				try {
					const sessionInfo = await wahaApi.sessions.getSession(instance.id);
					return {
						...instance,
						status: mapWahaStatusToInstanceStatus(sessionInfo.status),
						// Use pushname if available, otherwise keep DB name
						name: sessionInfo.me?.pushName || instance.name,
						// Store full WhatsApp ID as phoneNumber for now
						phoneNumber: sessionInfo.me?.id || instance.phoneNumber,
						// Include QR code if status requires it
						qrCode:
							sessionInfo.status === "SCAN_QR_CODE"
								? sessionInfo.qrCode
								: instance.qrCode,
					};
				} catch (error) {
					// If session fetch fails, return DB data but mark as disconnected
					console.error(
						`Failed to get Waha session for ${instance.id}:`,
						error,
					);
					return {
						...instance,
						// Keep DB status if fetch fails, or set to disconnected
						status:
							instance.status === "connecting" ? "connecting" : "disconnected",
					};
				}
			}),
		);

		return enrichedInstances;
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const dbInstance = await ctx.db.query.instances.findFirst({
				where: (instance, { eq, and }) =>
					and(
						eq(instance.id, input.id),
						eq(instance.createdById, ctx.session.user.id),
					),
				with: {
					agent: true,
				},
			});

			if (!dbInstance) return null;

			// Fetch real-time status from Waha
			try {
				const sessionInfo = await wahaApi.sessions.getSession(dbInstance.id);
				return {
					...dbInstance,
					status: mapWahaStatusToInstanceStatus(sessionInfo.status),
					name: sessionInfo.me?.pushName || dbInstance.name,
					phoneNumber: sessionInfo.me?.id || dbInstance.phoneNumber,
					qrCode:
						sessionInfo.status === "SCAN_QR_CODE"
							? sessionInfo.qrCode
							: dbInstance.qrCode,
				};
			} catch (error) {
				console.error(
					`Failed to get Waha session for ${dbInstance.id}:`,
					error,
				);
				return {
					...dbInstance,
					status:
						dbInstance.status === "connecting" ? "connecting" : "disconnected",
				};
			}
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(255), // Keep name for initial creation (from agent)
				// phoneNumber: z.string().optional(), // phoneNumber will be set after connection
				agentId: z.string().optional(),
				isAgentActive: z.boolean().optional().default(true),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const createInput: InstanceCreateInput & { createdById: string } = {
				name: input.name,
				// phoneNumber: input.phoneNumber || "",
				agentId: input.agentId,
				createdById: ctx.session.user.id,
			};

			const result = await ctx.db
				.insert(instances)
				.values({
					...createInput,
					status: "disconnected" as InstanceStatus, // Initial status
				})
				.returning();

			const newInstance = result[0];
			if (!newInstance) {
				throw new Error("Failed to create instance - no result returned");
			}

			// 如果指定了机器人ID，将机器人配置保存到Redis
			if (input.agentId) {
				try {
					// 获取完整的机器人信息
					const agent = await ctx.db.query.agents.findFirst({
						where: (agentRecord) => eq(agentRecord.id, input.agentId as string),
					});

					if (agent) {
						// 保存机器人配置，并设置活跃状态
						await saveInstanceAgent(newInstance.id, agent, input.isAgentActive);
						console.log(
							`已将实例 ${newInstance.id} 的机器人配置保存至Redis (isActive: ${input.isAgentActive})`,
						);
					}
				} catch (error) {
					console.error(
						`保存实例 ${newInstance.id} 的机器人配置到Redis失败:`,
						error,
					);
					// 不阻止创建实例，仅记录错误
				}
			}

			return newInstance;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(255).optional(), // Allow updating name if needed
				phoneNumber: z.string().optional(), // Allow updating phone if needed (e.g., manually)
				agentId: z.string().optional(),
				status: z.enum(["connected", "disconnected", "connecting"]).optional(), // Allow manual status override if necessary
				qrCode: z.string().optional(),
				sessionData: z.record(z.any()).optional(),
				isAgentActive: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// First make sure the instance belongs to the user
			const instance = await ctx.db.query.instances.findFirst({
				where: (instance, { eq, and }) =>
					and(
						eq(instance.id, input.id),
						eq(instance.createdById, ctx.session.user.id),
					),
			});

			if (!instance) {
				throw new Error(
					"Instance not found or you don't have permission to update it",
				);
			}

			const updateData: InstanceUpdateInput = {
				id: input.id,
			};

			if (input.name !== undefined) updateData.name = input.name;
			if (input.phoneNumber !== undefined)
				updateData.phoneNumber = input.phoneNumber;
			if (input.agentId !== undefined) updateData.agentId = input.agentId;
			if (input.status !== undefined) updateData.status = input.status;
			if (input.qrCode !== undefined) updateData.qrCode = input.qrCode;
			if (input.sessionData !== undefined)
				updateData.sessionData = input.sessionData;

			const result = await ctx.db
				.update(instances)
				.set(updateData)
				.where(eq(instances.id, input.id))
				.returning();

			const updatedInstance = result[0];
			if (!updatedInstance) {
				throw new Error("Failed to update instance - no result returned");
			}

			// 如果更新了机器人ID或机器人活跃状态，更新Redis中的配置
			if (input.agentId !== undefined || input.isAgentActive !== undefined) {
				try {
					if (input.agentId) {
						// 获取最新的机器人ID
						const agent = await ctx.db.query.agents.findFirst({
							where: (agentRecord) =>
								eq(agentRecord.id, input.agentId as string),
						});

						if (agent) {
							// 确定机器人活跃状态
							const isActive =
								input.isAgentActive !== undefined ? input.isAgentActive : true;

							// 保存机器人配置
							await saveInstanceAgent(updatedInstance.id, agent, isActive);
							console.log(
								`已更新实例 ${updatedInstance.id} 的机器人配置到Redis (isActive: ${isActive})`,
							);
						}
					} else if (input.agentId === null || input.agentId === "") {
						// 如果移除了机器人，清除Redis中的配置
						await saveInstanceAgent(updatedInstance.id, null);
						console.log(
							`已从Redis中移除实例 ${updatedInstance.id} 的机器人配置`,
						);
					} else if (input.isAgentActive !== undefined && instance.agentId) {
						// 如果只是更新机器人活跃状态
						// 获取当前的机器人配置
						const agent = await ctx.db.query.agents.findFirst({
							where: (agentRecord) =>
								eq(agentRecord.id, instance.agentId as string),
						});

						if (agent) {
							// 更新机器人活跃状态
							await saveInstanceAgent(
								updatedInstance.id,
								agent,
								input.isAgentActive,
							);
							console.log(
								`已更新实例 ${updatedInstance.id} 的机器人活跃状态为: ${input.isAgentActive}`,
							);
						}
					}
				} catch (error) {
					console.error(
						`更新实例 ${updatedInstance.id} 的Redis机器人配置失败:`,
						error,
					);
					// 不阻止更新实例，仅记录错误
				}
			}

			return updatedInstance;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// First make sure the instance belongs to the user
			const instance = await ctx.db.query.instances.findFirst({
				where: (instance, { eq, and }) =>
					and(
						eq(instance.id, input.id),
						eq(instance.createdById, ctx.session.user.id),
					),
			});

			if (!instance) {
				throw new Error(
					"Instance not found or you don't have permission to delete it",
				);
			}

			// 删除实例前，清理Redis中的数据
			try {
				await deleteInstanceData(input.id);
				console.log(`已清理实例 ${input.id} 的Redis数据`);
			} catch (error) {
				console.error(`清理实例 ${input.id} 的Redis数据失败:`, error);
				// 不阻止删除实例，仅记录错误
			}

			// 删除对应的 Waha session
			try {
				await wahaApi.sessions.deleteSession(input.id);
				console.log(`已删除实例 ${input.id} 的 Waha 会话`);
			} catch (error) {
				console.error(`删除实例 ${input.id} 的 Waha 会话失败:`, error);
				// 不阻止删除实例，仅记录错误
			}

			await ctx.db.delete(instances).where(eq(instances.id, input.id));
			return { success: true };
		}),

	setAgentActive: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				isActive: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// 确保实例属于用户
			const instance = await ctx.db.query.instances.findFirst({
				where: (instance, { eq, and }) =>
					and(
						eq(instance.id, input.id),
						eq(instance.createdById, ctx.session.user.id),
					),
				with: {
					agent: true,
				},
			});

			if (!instance) {
				throw new Error(
					"Instance not found or you don't have permission to update it",
				);
			}

			// 如果实例没有机器人，无法设置状态
			if (!instance.agent) {
				throw new Error(
					"Instance does not have an agent to activate/deactivate",
				);
			}

			try {
				// 保存更新后的机器人活跃状态
				await saveInstanceAgent(input.id, instance.agent, input.isActive);
				console.log(
					`已将实例 ${input.id} 的机器人活跃状态设置为: ${input.isActive}`,
				);

				return {
					success: true,
					id: input.id,
					isActive: input.isActive,
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				throw new Error(
					`Failed to update agent active status: ${errorMessage}`,
				);
			}
		}),
});
