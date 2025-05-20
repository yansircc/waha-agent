import { saveInstanceAgent } from "@/lib/instance-redis";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { agentToKb, agents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const agentsRouter = createTRPCRouter({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const result = await ctx.db.query.agents.findMany({
			where: (agent, { eq }) => eq(agent.createdById, ctx.session.user.id),
			orderBy: (agent, { desc }) => [desc(agent.createdAt)],
			with: {
				kbs: {
					with: {
						kb: true,
					},
				},
			},
		});

		// Transform the result to include kb objects
		return result.map((agent) => ({
			...agent,
			kbs: agent.kbs.map((relation) => relation.kb),
		}));
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.db.query.agents.findFirst({
				where: (agent, { eq, and }) =>
					and(
						eq(agent.id, input.id),
						eq(agent.createdById, ctx.session.user.id),
					),
				with: {
					kbs: {
						with: {
							kb: true,
						},
					},
				},
			});

			if (!result) return null;

			// Transform the result to include kb objects
			return {
				...result,
				kbs: result.kbs.map((relation) => relation.kb),
			};
		}),

	create: protectedProcedure
		.input(
			z.object({
				apiKey: z.string(),
				name: z.string().min(1).max(255),
				prompt: z.string(),
				model: z.string(),
				kbIds: z.array(z.string()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Create the agent
			const agentData = {
				apiKey: input.apiKey,
				name: input.name,
				prompt: input.prompt,
				model: input.model,
				kbIds: input.kbIds || null,
				createdById: ctx.session.user.id,
			};

			const insertResult = await ctx.db
				.insert(agents)
				.values(agentData)
				.returning();

			if (!insertResult[0]) {
				throw new Error("Failed to create agent");
			}

			const agentId = insertResult[0].id;

			// If knowledge base IDs are provided, create the relationships
			if (input.kbIds?.length) {
				await ctx.db.insert(agentToKb).values(
					input.kbIds.map((kbId) => ({
						agentId,
						kbId: kbId,
					})),
				);
			}

			return insertResult[0];
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				apiKey: z.string().optional(),
				name: z.string().min(1).max(255).optional(),
				prompt: z.string().optional(),
				model: z.string().optional(),
				kbIds: z.array(z.string()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// First make sure the agent belongs to the user
			const agent = await ctx.db.query.agents.findFirst({
				where: (agent, { eq, and }) =>
					and(
						eq(agent.id, input.id),
						eq(agent.createdById, ctx.session.user.id),
					),
			});

			if (!agent) {
				throw new Error(
					"Agent not found or you don't have permission to update it",
				);
			}

			const updateData: Record<string, unknown> = {};
			if (input.name !== undefined) updateData.name = input.name;
			if (input.apiKey !== undefined) updateData.apiKey = input.apiKey;
			if (input.prompt !== undefined) updateData.prompt = input.prompt;
			if (input.kbIds !== undefined) updateData.kbIds = input.kbIds;
			if (input.model !== undefined) updateData.model = input.model;

			// Update the agent
			const updateResult = await ctx.db
				.update(agents)
				.set(updateData)
				.where(eq(agents.id, input.id))
				.returning();

			if (!updateResult[0]) {
				throw new Error("Failed to update agent");
			}

			// If knowledge base IDs are provided, update the relationships
			if (input.kbIds !== undefined) {
				// Delete existing relationships
				await ctx.db.delete(agentToKb).where(eq(agentToKb.agentId, input.id));

				// Create new relationships
				if (input.kbIds.length > 0) {
					await ctx.db.insert(agentToKb).values(
						input.kbIds.map((kbId) => ({
							agentId: input.id,
							kbId: kbId,
						})),
					);
				}
			}

			// 更新完代理后，找到所有使用该代理的实例
			try {
				// 查询使用此 agent 的所有实例
				const relatedInstances = await ctx.db.query.instances.findMany({
					where: (instance) => eq(instance.agentId, input.id),
				});

				if (relatedInstances.length > 0) {
					console.log(
						`找到 ${relatedInstances.length} 个使用此 agent 的实例，更新 Redis 缓存...`,
					);

					// 获取更新后的完整 agent 信息
					const updatedAgent = await ctx.db.query.agents.findFirst({
						where: (agent) => eq(agent.id, input.id),
						with: {
							kbs: {
								with: {
									kb: true,
								},
							},
						},
					});

					if (updatedAgent) {
						// 并行更新所有实例的 Redis 缓存
						await Promise.all(
							relatedInstances.map(async (instance) => {
								// 转换 agent 为需要的格式
								const agentToSave = {
									...updatedAgent,
									kbs: updatedAgent.kbs.map((relation) => relation.kb),
								};

								// 获取当前实例 agent 的活跃状态，保持不变
								let isActive = true;
								try {
									const _redisAgentData =
										await ctx.db.query.instances.findFirst({
											where: (inst) => eq(inst.id, instance.id),
										});
									// 这里假设实例中有一个字段保存了 agent 是否活跃的信息
									// 如果没有特定字段，请根据实际情况调整
									isActive = true; // 默认为活跃
								} catch (redisErr) {
									console.error(
										`获取实例 ${instance.id} 的 agent 活跃状态失败:`,
										redisErr,
									);
								}

								// 使用 lib/instance-redis.ts 中的函数更新 Redis
								await saveInstanceAgent(instance.id, agentToSave, isActive);
								console.log(`已更新实例 ${instance.id} 的 agent Redis 缓存`);
							}),
						);
					}
				}
			} catch (redisError) {
				// 如果 Redis 更新失败，记录错误但不阻止 agent 更新
				console.error("更新实例的 Redis 缓存失败:", redisError);
			}

			return updateResult[0];
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// First make sure the agent belongs to the user
			const agent = await ctx.db.query.agents.findFirst({
				where: (agent, { eq, and }) =>
					and(
						eq(agent.id, input.id),
						eq(agent.createdById, ctx.session.user.id),
					),
			});

			if (!agent) {
				throw new Error(
					"Agent not found or you don't have permission to delete it",
				);
			}

			// 在删除 agent 前，查找并更新所有使用此 agent 的实例的 Redis 缓存
			try {
				// 查询使用此 agent 的所有实例
				const relatedInstances = await ctx.db.query.instances.findMany({
					where: (instance) => eq(instance.agentId, input.id),
				});

				if (relatedInstances.length > 0) {
					console.log(
						`删除 agent 前，清理 ${relatedInstances.length} 个相关实例的 Redis 缓存...`,
					);

					// 并行清理所有实例的 Redis 缓存
					await Promise.all(
						relatedInstances.map(async (instance) => {
							// 传入 null 作为 agent 参数，表示移除 agent 配置
							await saveInstanceAgent(instance.id, null);
							console.log(`已清理实例 ${instance.id} 的 agent Redis 缓存`);
						}),
					);
				}
			} catch (redisError) {
				// 如果 Redis 更新失败，记录错误但不阻止 agent 删除
				console.error("清理实例的 Redis 缓存失败:", redisError);
			}

			// Delete the agent (relations will be cascade deleted)
			await ctx.db.delete(agents).where(eq(agents.id, input.id));
			return { success: true };
		}),

	getKbs: protectedProcedure
		.input(
			z.object({
				agentId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const result = await ctx.db.query.agentToKb.findMany({
				where: eq(agentToKb.agentId, input.agentId),
			});

			return result;
		}),
});
