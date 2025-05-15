import { getRedisForInstance, safeRedisOperation } from "@/lib/redis";
import { auth } from "@/server/auth";
import type { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * API endpoint to manually delete all session jobs
 * GET /api/del-all-sessions
 */
export async function GET() {
	try {
		const session = await auth();
		if (!session || !(session.user?.email === "cnmarkyan@gmail.com")) {
			return NextResponse.json(
				{
					success: false,
					message: "当前用户无权限执行此操作",
				},
				{ status: 401 },
			);
		}

		const redis = getRedisForInstance();
		const deletedCount = await deleteAllSessionJobs(redis);

		return NextResponse.json({
			success: true,
			message: `Successfully deleted ${deletedCount} session jobs`,
			deletedCount,
		});
	} catch (error) {
		console.error("Failed to delete all session jobs:", error);

		return NextResponse.json(
			{
				success: false,
				message: "Failed to delete all session jobs",
				error: (error as Error).message,
			},
			{ status: 500 },
		);
	}
}

/**
 * Deletes all session jobs from Redis
 */
async function deleteAllSessionJobs(redis: Redis): Promise<number> {
	return await safeRedisOperation(async () => {
		const QUEUE_PREFIX = "session";
		let totalDeleted = 0;

		// Delete all jobs hash
		const allJobs = (await redis.hgetall(`${QUEUE_PREFIX}:jobs`)) || {};
		const jobIds = Object.keys(allJobs);

		if (jobIds.length > 0) {
			await redis.hdel(`${QUEUE_PREFIX}:jobs`, ...jobIds);
			totalDeleted = jobIds.length;
		}

		// Find and delete individual job keys (session:jobs:{jobId})
		const individualJobKeys = await redis.keys(`${QUEUE_PREFIX}:jobs:*`);
		if (individualJobKeys.length > 0) {
			await redis.del(...individualJobKeys);
			totalDeleted += individualJobKeys.length;
		}

		// Clear all queue types
		const operations = [
			"create",
			"start",
			"stop",
			"restart",
			"logout",
			"delete",
		];

		for (const operation of operations) {
			// Delete waiting queue
			await redis.del(`${QUEUE_PREFIX}:${operation}:queue`);
			// Delete active queue
			await redis.del(`${QUEUE_PREFIX}:${operation}:active`);
		}

		return totalDeleted;
	});
}
