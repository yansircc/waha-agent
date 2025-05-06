import { getRedisForInstance, safeRedisOperation } from "@/lib/redis";
import { wahaApi } from "@/server/api/routers/waha-api";

// 支持的会话操作类型
export type SessionOperation =
	| "create"
	| "start"
	| "stop"
	| "restart"
	| "logout"
	| "delete";

export interface SessionJob {
	id: string;
	instanceId: string;
	operation: SessionOperation;
	status: "waiting" | "active" | "completed" | "failed";
	createdAt: number;
	startedAt?: number;
}

// 队列键名前缀
const QUEUE_PREFIX = "session";
// 最大并发处理数
const MAX_CONCURRENT = 3;
// 任务超时时间 (ms)
const JOB_TIMEOUT_MS = 15000; // 15 seconds timeout

// TTL 设置 (seconds)
const DEFAULT_JOB_TTL = 24 * 60 * 60; // 24小时 - 默认任务TTL
const COMPLETED_JOB_TTL = 1 * 60 * 60; // 1小时 - 已完成任务的TTL
const FAILED_JOB_TTL = 2 * 60 * 60; // 2小时 - 失败任务的TTL
const QUEUE_KEY_TTL = 7 * 24 * 60 * 60; // 7天 - 队列键的TTL

// 获取队列键名
function getQueueKeys(operation: SessionOperation) {
	return {
		waitingQueue: `${QUEUE_PREFIX}:${operation}:queue`,
		activeQueue: `${QUEUE_PREFIX}:${operation}:active`,
		jobsHash: `${QUEUE_PREFIX}:jobs`,
	};
}

/**
 * 添加一个会话操作任务到队列
 */
export async function addToQueue(
	instanceId: string,
	operation: SessionOperation = "create",
): Promise<SessionJob | null> {
	const redis = getRedisForInstance();

	// 创建任务
	const job: SessionJob = {
		id: `${instanceId}-${operation}-${Date.now()}`,
		instanceId,
		operation,
		status: "waiting",
		createdAt: Date.now(),
	};

	return await safeRedisOperation(async () => {
		const { waitingQueue, activeQueue, jobsHash } = getQueueKeys(operation);

		// 确保队列键存在并设置TTL
		await redis.expire(waitingQueue, QUEUE_KEY_TTL);
		await redis.expire(activeQueue, QUEUE_KEY_TTL);
		await redis.expire(jobsHash, QUEUE_KEY_TTL);

		// 如果是delete操作，给予更高优先级处理
		if (operation === "delete") {
			try {
				// 直接标记为活跃并执行
				job.status = "active";
				job.startedAt = Date.now();

				// 保存任务信息
				const jobJson = JSON.stringify(job);
				await redis.set(`${jobsHash}:${job.id}`, jobJson);
				await redis.expire(`${jobsHash}:${job.id}`, DEFAULT_JOB_TTL);
				await redis.rpush(activeQueue, job.id);

				// 异步执行删除操作
				setTimeout(async () => {
					try {
						const success = await executeSessionDelete(instanceId);

						// 执行完成后更新任务状态
						const updatedJob = {
							...job,
							status: success ? "completed" : "failed",
						};
						const updatedJobJson = JSON.stringify(updatedJob);
						await redis.set(`${jobsHash}:${job.id}`, updatedJobJson);

						// 设置TTL
						const ttl = success ? COMPLETED_JOB_TTL : FAILED_JOB_TTL;
						await redis.expire(`${jobsHash}:${job.id}`, ttl);

						// 从活跃队列中移除
						await redis.lrem(activeQueue, 0, job.id);
					} catch (execError) {
						console.error("执行删除操作时出错:", execError);
					}
				}, 0);

				return job;
			} catch (error) {
				console.error("处理删除操作失败:", error);
				return null;
			}
		}

		// 使用Lua脚本确保原子操作
		const script = `
      -- 获取当前活跃任务数
      local activeCount = redis.call('LLEN', KEYS[2])
      
      -- 判断是否超过并发限制
      if activeCount >= tonumber(ARGV[2]) then
        -- 添加到等待队列
        redis.call('RPUSH', KEYS[1], ARGV[1])
        redis.call('HSET', KEYS[3], ARGV[1], ARGV[3])
        -- 设置任务TTL
        redis.call('EXPIRE', KEYS[3], tonumber(ARGV[5]))
        return 0
      else
        -- 直接添加到活跃队列
        redis.call('RPUSH', KEYS[2], ARGV[1])
        
        -- 设置任务开始时间
        local jobData = cjson.decode(ARGV[3])
        jobData.status = "active"
        jobData.startedAt = tonumber(ARGV[4])
        redis.call('HSET', KEYS[3], ARGV[1], cjson.encode(jobData))
        -- 设置任务TTL
        redis.call('EXPIRE', KEYS[3], tonumber(ARGV[5]))
        
        return 1
      end
    `;

		const jobData = JSON.stringify(job);
		const now = Date.now();

		try {
			// 执行 Redis 脚本
			const result = await redis.eval(
				script,
				[waitingQueue, activeQueue, jobsHash],
				[
					job.id,
					MAX_CONCURRENT.toString(),
					jobData,
					now.toString(),
					DEFAULT_JOB_TTL.toString(),
				],
			);

			// 更新状态
			if (result === 1) {
				job.status = "active";
				job.startedAt = now;

				// 设置自动超时处理
				setTimeout(() => {
					void checkJobTimeout(job.id);
				}, JOB_TIMEOUT_MS);
			}

			return job;
		} catch (error) {
			console.error("添加任务到队列出错:", error);
			return null;
		}
	});
}

/**
 * 检查任务是否超时
 */
async function checkJobTimeout(jobId: string): Promise<void> {
	const redis = getRedisForInstance();

	try {
		// 获取任务状态
		const jobData = await redis.hget(`${QUEUE_PREFIX}:jobs`, jobId);
		if (!jobData) return;

		// 安全解析 JSON 数据
		let job: SessionJob;
		try {
			// 如果 jobData 已经是对象，则直接使用；如果是字符串，则解析
			job =
				typeof jobData === "string"
					? (JSON.parse(jobData) as SessionJob)
					: (jobData as unknown as SessionJob);
		} catch (parseError) {
			console.error("解析任务数据出错:", parseError, "原始数据:", jobData);
			return;
		}

		// 只检查活跃状态的任务
		if (job.status !== "active") return;

		// 计算任务运行时间
		const now = Date.now();
		const runTime = now - (job.startedAt || now);

		// 如果超过timeout，则标记为失败
		if (runTime >= JOB_TIMEOUT_MS) {
			console.log(`任务 ${jobId} 超时(${runTime}ms)，自动标记为失败`);
			await failJob(jobId);
		}
	} catch (error) {
		console.error("检查任务超时出错:", error);
	}
}

/**
 * 标记任务为完成状态并处理下一个队列
 */
export async function completeJob(jobId: string): Promise<SessionJob | null> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
		// 先获取任务信息，确定其操作类型
		const jobData = await redis.hget(`${QUEUE_PREFIX}:jobs`, jobId);
		if (!jobData) return null;

		let job: SessionJob;
		try {
			job =
				typeof jobData === "string"
					? (JSON.parse(jobData) as SessionJob)
					: (jobData as unknown as SessionJob);
		} catch (error) {
			console.error("解析任务数据出错:", error);
			return null;
		}

		const { waitingQueue, activeQueue, jobsHash } = getQueueKeys(job.operation);

		// 使用Lua脚本确保原子操作
		const script = `
      -- 从活跃队列中移除
      redis.call('LREM', KEYS[2], 0, ARGV[1])
      
      -- 获取任务数据
      local jobData = redis.call('HGET', KEYS[3], ARGV[1])
      if not jobData then
        return nil
      end
      
      -- 更新任务状态
      local job = cjson.decode(jobData)
      job.status = "completed"
      redis.call('HSET', KEYS[3], ARGV[1], cjson.encode(job))
      -- 设置已完成任务的较短TTL
      redis.call('EXPIRE', KEYS[3], tonumber(ARGV[3]))
      
      -- 处理等待队列中的下一个任务
      local nextJobId = redis.call('LPOP', KEYS[1])
      if nextJobId then
        local nextJobData = redis.call('HGET', KEYS[3], nextJobId)
        if nextJobData then
          local nextJob = cjson.decode(nextJobData)
          nextJob.status = "active"
          nextJob.startedAt = tonumber(ARGV[2])
          redis.call('HSET', KEYS[3], nextJobId, cjson.encode(nextJob))
          -- 为新激活的任务设置默认TTL
          redis.call('EXPIRE', KEYS[3], tonumber(ARGV[4]))
          redis.call('RPUSH', KEYS[2], nextJobId)
          return cjson.encode(nextJob)
        end
      end
      
      return jobData
    `;

		const now = Date.now();
		const result = await redis.eval(
			script,
			[waitingQueue, activeQueue, jobsHash],
			[
				jobId,
				now.toString(),
				COMPLETED_JOB_TTL.toString(),
				DEFAULT_JOB_TTL.toString(),
			],
		);

		if (!result) return null;

		// 安全解析返回的任务数据
		let resultJob: SessionJob | null = null;
		try {
			resultJob =
				typeof result === "string"
					? (JSON.parse(result) as SessionJob)
					: (result as unknown as SessionJob);
		} catch (error) {
			console.error("解析完成任务数据出错:", error);
			return null;
		}

		// 如果有下一个任务被激活，设置它的超时处理
		if (resultJob && resultJob.status === "active" && resultJob.id !== jobId) {
			const nextJobId = resultJob.id;
			setTimeout(() => {
				void checkJobTimeout(nextJobId);
			}, JOB_TIMEOUT_MS);
		}

		return resultJob;
	});
}

/**
 * 标记任务失败并处理下一个队列项
 */
async function failJob(jobId: string): Promise<SessionJob | null> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
		// 先获取任务信息，确定其操作类型
		const jobData = await redis.hget(`${QUEUE_PREFIX}:jobs`, jobId);
		if (!jobData) return null;

		let job: SessionJob;
		try {
			job =
				typeof jobData === "string"
					? (JSON.parse(jobData) as SessionJob)
					: (jobData as unknown as SessionJob);
		} catch (error) {
			console.error("解析任务数据出错:", error);
			return null;
		}

		const { waitingQueue, activeQueue, jobsHash } = getQueueKeys(job.operation);

		// 几乎与completeJob相同的逻辑，但状态标记为failed
		const script = `
      redis.call('LREM', KEYS[2], 0, ARGV[1])
      
      local jobData = redis.call('HGET', KEYS[3], ARGV[1])
      if not jobData then
        return nil
      end
      
      local job = cjson.decode(jobData)
      job.status = "failed"
      redis.call('HSET', KEYS[3], ARGV[1], cjson.encode(job))
      -- 设置失败任务的TTL
      redis.call('EXPIRE', KEYS[3], tonumber(ARGV[3]))
      
      local nextJobId = redis.call('LPOP', KEYS[1])
      if nextJobId then
        local nextJobData = redis.call('HGET', KEYS[3], nextJobId)
        if nextJobData then
          local nextJob = cjson.decode(nextJobData)
          nextJob.status = "active"
          nextJob.startedAt = tonumber(ARGV[2])
          redis.call('HSET', KEYS[3], nextJobId, cjson.encode(nextJob))
          -- 为新激活的任务设置默认TTL
          redis.call('EXPIRE', KEYS[3], tonumber(ARGV[4]))
          redis.call('RPUSH', KEYS[2], nextJobId)
          return cjson.encode(nextJob)
        end
      end
      
      return jobData
    `;

		const now = Date.now();
		const result = await redis.eval(
			script,
			[waitingQueue, activeQueue, jobsHash],
			[
				jobId,
				now.toString(),
				FAILED_JOB_TTL.toString(),
				DEFAULT_JOB_TTL.toString(),
			],
		);

		if (!result) return null;

		// 安全解析返回的任务数据
		let resultJob: SessionJob | null = null;
		try {
			resultJob =
				typeof result === "string"
					? (JSON.parse(result) as SessionJob)
					: (result as unknown as SessionJob);
		} catch (error) {
			console.error("解析失败任务数据出错:", error);
			return null;
		}

		// 如果有下一个任务被激活，设置它的超时处理
		if (resultJob && resultJob.status === "active" && resultJob.id !== jobId) {
			const nextJobId = resultJob.id;
			setTimeout(() => {
				void checkJobTimeout(nextJobId);
			}, JOB_TIMEOUT_MS);
		}

		return resultJob;
	});
}

/**
 * 获取任务状态
 */
async function getJobStatus(jobId: string): Promise<SessionJob | null> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
		const jobData = await redis.hget(`${QUEUE_PREFIX}:jobs`, jobId);
		if (!jobData) return null;

		try {
			return typeof jobData === "string"
				? (JSON.parse(jobData) as SessionJob)
				: (jobData as unknown as SessionJob);
		} catch (error) {
			console.error("解析任务状态数据出错:", error);
			return null;
		}
	});
}

/**
 * 根据实例ID和操作类型查找活跃任务
 */
export async function findActiveJobByInstanceId(
	instanceId: string,
	operation?: SessionOperation,
): Promise<SessionJob | null> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
		if (operation) {
			// 如果指定了操作类型，只在该操作的活跃队列中查找
			const { activeQueue, jobsHash } = getQueueKeys(operation);
			const activeJobIds = await redis.lrange(activeQueue, 0, -1);

			// 遍历所有活跃任务ID
			for (const jobId of activeJobIds) {
				const jobData = await redis.hget(jobsHash, jobId);
				if (!jobData) continue;

				try {
					const job =
						typeof jobData === "string"
							? (JSON.parse(jobData) as SessionJob)
							: (jobData as unknown as SessionJob);

					if (job.instanceId === instanceId) {
						return job;
					}
				} catch (error) {
					console.error("解析活跃任务数据出错:", error, "任务ID:", jobId);
				}
			}
		} else {
			// 如果没有指定操作类型，遍历所有操作类型的活跃队列
			const operations: SessionOperation[] = [
				"create",
				"start",
				"stop",
				"restart",
				"logout",
			];

			for (const op of operations) {
				const { activeQueue, jobsHash } = getQueueKeys(op);
				const activeJobIds = await redis.lrange(activeQueue, 0, -1);

				for (const jobId of activeJobIds) {
					const jobData = await redis.hget(jobsHash, jobId);
					if (!jobData) continue;

					try {
						const job =
							typeof jobData === "string"
								? (JSON.parse(jobData) as SessionJob)
								: (jobData as unknown as SessionJob);

						if (job.instanceId === instanceId) {
							return job;
						}
					} catch (error) {
						console.error("解析活跃任务数据出错:", error, "任务ID:", jobId);
					}
				}
			}
		}

		return null;
	});
}

/**
 * 获取队列统计信息
 */
export async function getQueueStats(operation?: SessionOperation): Promise<{
	waitingCount: number;
	activeCount: number;
	totalJobs: number;
	queuePositions: Record<string, number>;
}> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
		if (operation) {
			// 获取指定操作类型的队列统计
			const { waitingQueue, activeQueue } = getQueueKeys(operation);

			// 获取等待队列中的所有任务ID
			const waitingJobIds = await redis.lrange(waitingQueue, 0, -1);
			const waitingCount = waitingJobIds.length;
			const activeCount = await redis.llen(activeQueue);

			// 计算每个任务在队列中的位置
			const queuePositions: Record<string, number> = {};
			waitingJobIds.forEach((jobId, index) => {
				queuePositions[jobId] = index;
			});

			// 计算总任务数
			const totalJobs = await redis.hlen(`${QUEUE_PREFIX}:jobs`);

			return {
				waitingCount,
				activeCount,
				totalJobs,
				queuePositions,
			};
		}

		// 汇总所有操作类型的队列统计
		const operations: SessionOperation[] = [
			"create",
			"start",
			"stop",
			"restart",
			"logout",
		];
		let totalWaitingCount = 0;
		let totalActiveCount = 0;
		const queuePositions: Record<string, number> = {};

		for (const op of operations) {
			const { waitingQueue, activeQueue } = getQueueKeys(op);

			// 获取等待队列中的所有任务ID
			const waitingJobIds = await redis.lrange(waitingQueue, 0, -1);
			totalWaitingCount += waitingJobIds.length;
			totalActiveCount += await redis.llen(activeQueue);

			// 计算每个任务在队列中的位置
			waitingJobIds.forEach((jobId, index) => {
				queuePositions[jobId] = index;
			});
		}

		// 计算总任务数
		const totalJobs = await redis.hlen(`${QUEUE_PREFIX}:jobs`);

		return {
			waitingCount: totalWaitingCount,
			activeCount: totalActiveCount,
			totalJobs,
			queuePositions,
		};
	});
}

/**
 * 清理旧任务（可作为定期任务运行）
 */
export async function cleanupOldJobs(olderThanHours = 24): Promise<number> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
		const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
		const allJobs = (await redis.hgetall(`${QUEUE_PREFIX}:jobs`)) || {};
		let cleanedCount = 0;

		for (const [jobId, jobDataStr] of Object.entries(allJobs)) {
			// 确保jobDataStr是字符串
			try {
				const jobData =
					typeof jobDataStr === "string"
						? (JSON.parse(jobDataStr) as SessionJob)
						: (jobDataStr as unknown as SessionJob);

				// 只清理已完成或失败的任务
				if (
					(jobData.status === "completed" || jobData.status === "failed") &&
					jobData.createdAt < cutoffTime
				) {
					await redis.hdel(`${QUEUE_PREFIX}:jobs`, jobId);
					cleanedCount++;
				}
			} catch (error) {
				console.error("解析任务数据出错:", error);
			}
		}

		return cleanedCount;
	});
}

/**
 * 添加删除会话操作到队列
 * 专用于处理实例删除的便捷函数
 */
export async function queueSessionDelete(
	instanceId: string,
): Promise<SessionJob | null> {
	try {
		// 使用统一的队列机制
		const job = await addToQueue(instanceId, "delete");

		if (job) {
			console.log(
				`已将实例 ${instanceId} 的删除操作添加到队列，任务ID: ${job.id}`,
			);
			return job;
		}

		console.error(`将实例 ${instanceId} 的删除操作添加到队列失败`);
		return null;
	} catch (error) {
		console.error("将删除操作添加到队列时出错:", error);
		return null;
	}
}

/**
 * 执行会话删除操作
 * 用于执行删除队列中的任务
 */
async function executeSessionDelete(instanceId: string): Promise<boolean> {
	try {
		console.log(`正在执行实例 ${instanceId} 的删除操作`);

		// 直接调用wahaApi删除会话
		await wahaApi.sessions.deleteSession(instanceId);

		console.log(`实例 ${instanceId} 删除操作完成`);
		return true;
	} catch (error) {
		console.error(`执行实例 ${instanceId} 删除操作失败:`, error);
		return false;
	}
}
