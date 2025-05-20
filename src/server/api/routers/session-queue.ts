import {
	type SessionOperation,
	addToQueue,
	cleanupOldJobs,
	completeJob,
	findActiveJobByInstanceId,
	getQueueStats,
} from "@/lib/queue/session-queue";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

/**
 * 会话队列API路由
 */
export const sessionQueueRouter = createTRPCRouter({
	/**
	 * 获取队列统计信息
	 */
	getStats: protectedProcedure
		.input(
			z
				.object({
					operation: z
						.enum(["create", "start", "stop", "restart", "logout", "delete"])
						.optional(),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			// 获取队列基本统计信息
			const stats = await getQueueStats(input?.operation);
			return stats;
		}),

	/**
	 * 检查实例是否有活跃任务
	 */
	checkActiveJob: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				operation: z
					.enum(["create", "start", "stop", "restart", "logout", "delete"])
					.optional(),
			}),
		)
		.query(async ({ input }) => {
			const job = await findActiveJobByInstanceId(
				input.instanceId,
				input.operation,
			);
			return {
				hasActiveJob: !!job,
				job,
			};
		}),

	/**
	 * 添加实例到队列
	 */
	addToQueue: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				operation: z
					.enum(["create", "start", "stop", "restart", "logout"])
					.optional(),
				userWahaApiEndpoint: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			// 将操作添加到相应队列，默认为创建操作
			const operation = (input.operation as SessionOperation) || "create";
			const job = await addToQueue(
				input.instanceId,
				input.userWahaApiEndpoint,
				operation,
			);
			return { success: true, job };
		}),

	/**
	 * 完成队列中的任务
	 */
	completeJob: protectedProcedure
		.input(z.object({ jobId: z.string() }))
		.mutation(async ({ input }) => {
			const job = await completeJob(input.jobId);
			return { success: true, job };
		}),

	/**
	 * 清理旧任务
	 */
	cleanupOldJobs: protectedProcedure
		.input(z.object({ hours: z.number().optional() }))
		.mutation(async ({ input }) => {
			const count = await cleanupOldJobs(input.hours);
			return { success: true, count };
		}),
});
