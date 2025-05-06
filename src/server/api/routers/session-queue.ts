import {
	addToQueue,
	cleanupOldJobs,
	completeJob,
	findActiveJobByInstanceId,
	getQueueStats,
} from "@/lib/queue/session-queue";
import { redis } from "@/lib/redis";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

/**
 * 会话队列API路由
 */
export const sessionQueueRouter = createTRPCRouter({
	/**
	 * 获取队列统计信息
	 */
	getStats: protectedProcedure.query(async () => {
		// 获取队列基本统计信息
		const stats = await getQueueStats();

		// 获取等待队列中的所有任务ID
		const waitingJobIds = await redis.lrange("session:queue", 0, -1);

		// 计算每个任务在队列中的位置
		const queuePositions: Record<string, number> = {};
		waitingJobIds.forEach((jobId, index) => {
			queuePositions[jobId] = index;
		});

		return {
			...stats,
			queuePositions,
		};
	}),

	/**
	 * 检查实例是否有活跃任务
	 */
	checkActiveJob: protectedProcedure
		.input(z.object({ instanceId: z.string() }))
		.query(async ({ input }) => {
			const job = await findActiveJobByInstanceId(input.instanceId);
			return {
				hasActiveJob: !!job,
				job,
			};
		}),

	/**
	 * 添加实例到队列
	 */
	addToQueue: protectedProcedure
		.input(z.object({ instanceId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			// 获取用户ID从tRPC上下文，此时无需传递userId参数
			const job = await addToQueue(input.instanceId);
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
