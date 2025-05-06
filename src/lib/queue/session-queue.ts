import { getRedisForInstance, safeRedisOperation } from "@/lib/redis";

export interface SessionJob {
	id: string;
	instanceId: string;
	status: "waiting" | "active" | "completed" | "failed";
	createdAt: number;
	startedAt?: number;
}

// Queue keys
const QUEUE_KEY = "session:queue";
const ACTIVE_KEY = "session:active";
const JOBS_KEY = "session:jobs";
const MAX_CONCURRENT = 1;
const JOB_TIMEOUT_MS = 10000; // 10 seconds timeout

/**
 * 添加一个会话创建任务到队列
 */
export async function addToQueue(
	instanceId: string,
): Promise<SessionJob | null> {
	const redis = getRedisForInstance();

	// 创建任务
	const job: SessionJob = {
		id: `${instanceId}-${Date.now()}`,
		instanceId,
		status: "waiting",
		createdAt: Date.now(),
	};

	return await safeRedisOperation(async () => {
		// 使用Lua脚本确保原子操作
		const script = `
      -- 获取当前活跃任务数
      local activeCount = redis.call('LLEN', KEYS[2])
      
      -- 判断是否超过并发限制
      if activeCount >= tonumber(ARGV[2]) then
        -- 添加到等待队列
        redis.call('RPUSH', KEYS[1], ARGV[1])
        redis.call('HSET', KEYS[3], ARGV[1], ARGV[3])
        return 0
      else
        -- 直接添加到活跃队列
        redis.call('RPUSH', KEYS[2], ARGV[1])
        
        -- 设置任务开始时间
        local jobData = cjson.decode(ARGV[3])
        jobData.status = "active"
        jobData.startedAt = tonumber(ARGV[4])
        redis.call('HSET', KEYS[3], ARGV[1], cjson.encode(jobData))
        
        return 1
      end
    `;

		const jobData = JSON.stringify(job);
		const now = Date.now();

		try {
			// 执行 Redis 脚本
			const result = await redis.eval(
				script,
				[QUEUE_KEY, ACTIVE_KEY, JOBS_KEY],
				[job.id, MAX_CONCURRENT.toString(), jobData, now.toString()],
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
		const jobData = await redis.hget(JOBS_KEY, jobId);
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
      
      -- 处理等待队列中的下一个任务
      local nextJobId = redis.call('LPOP', KEYS[1])
      if nextJobId then
        local nextJobData = redis.call('HGET', KEYS[3], nextJobId)
        if nextJobData then
          local nextJob = cjson.decode(nextJobData)
          nextJob.status = "active"
          nextJob.startedAt = tonumber(ARGV[2])
          redis.call('HSET', KEYS[3], nextJobId, cjson.encode(nextJob))
          redis.call('RPUSH', KEYS[2], nextJobId)
          return cjson.encode(nextJob)
        end
      end
      
      return jobData
    `;

		const now = Date.now();
		const result = await redis.eval(
			script,
			[QUEUE_KEY, ACTIVE_KEY, JOBS_KEY],
			[jobId, now.toString()],
		);

		if (!result) return null;

		// 安全解析返回的任务数据
		let jobData: SessionJob | null = null;
		try {
			jobData =
				typeof result === "string"
					? (JSON.parse(result) as SessionJob)
					: (result as unknown as SessionJob);
		} catch (error) {
			console.error("解析完成任务数据出错:", error);
			return null;
		}

		// 如果有下一个任务被激活，设置它的超时处理
		if (jobData && jobData.status === "active" && jobData.id !== jobId) {
			const nextJobId = jobData.id;
			setTimeout(() => {
				void checkJobTimeout(nextJobId);
			}, JOB_TIMEOUT_MS);
		}

		return jobData;
	});
}

/**
 * 标记任务失败并处理下一个队列项
 */
export async function failJob(jobId: string): Promise<SessionJob | null> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
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
      
      local nextJobId = redis.call('LPOP', KEYS[1])
      if nextJobId then
        local nextJobData = redis.call('HGET', KEYS[3], nextJobId)
        if nextJobData then
          local nextJob = cjson.decode(nextJobData)
          nextJob.status = "active"
          nextJob.startedAt = tonumber(ARGV[2])
          redis.call('HSET', KEYS[3], nextJobId, cjson.encode(nextJob))
          redis.call('RPUSH', KEYS[2], nextJobId)
          return cjson.encode(nextJob)
        end
      end
      
      return jobData
    `;

		const now = Date.now();
		const result = await redis.eval(
			script,
			[QUEUE_KEY, ACTIVE_KEY, JOBS_KEY],
			[jobId, now.toString()],
		);

		if (!result) return null;

		// 安全解析返回的任务数据
		let jobData: SessionJob | null = null;
		try {
			jobData =
				typeof result === "string"
					? (JSON.parse(result) as SessionJob)
					: (result as unknown as SessionJob);
		} catch (error) {
			console.error("解析失败任务数据出错:", error);
			return null;
		}

		// 如果有下一个任务被激活，设置它的超时处理
		if (jobData && jobData.status === "active" && jobData.id !== jobId) {
			const nextJobId = jobData.id;
			setTimeout(() => {
				void checkJobTimeout(nextJobId);
			}, JOB_TIMEOUT_MS);
		}

		return jobData;
	});
}

/**
 * 获取任务状态
 */
export async function getJobStatus(jobId: string): Promise<SessionJob | null> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
		const jobData = await redis.hget(JOBS_KEY, jobId);
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
 * 根据实例ID查找活跃任务
 */
export async function findActiveJobByInstanceId(
	instanceId: string,
): Promise<SessionJob | null> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
		// 获取所有活跃任务ID
		const activeJobIds = await redis.lrange(ACTIVE_KEY, 0, -1);

		// 对每个活跃任务检查实例ID
		for (const jobId of activeJobIds) {
			const jobData = await redis.hget(JOBS_KEY, jobId);
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

		return null;
	});
}

/**
 * 获取队列统计信息
 */
export async function getQueueStats(): Promise<{
	waitingCount: number;
	activeCount: number;
	totalJobs: number;
}> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
		const [waitingCount, activeCount, totalJobs] = await Promise.all([
			redis.llen(QUEUE_KEY),
			redis.llen(ACTIVE_KEY),
			redis.hlen(JOBS_KEY),
		]);

		return {
			waitingCount,
			activeCount,
			totalJobs,
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
		const allJobs = (await redis.hgetall(JOBS_KEY)) || {};
		let cleanedCount = 0;

		for (const [jobId, jobDataStr] of Object.entries(allJobs)) {
			// 确保jobDataStr是字符串
			const jobData = JSON.parse(jobDataStr as string) as SessionJob;

			// 只清理已完成或失败的任务
			if (
				(jobData.status === "completed" || jobData.status === "failed") &&
				jobData.createdAt < cutoffTime
			) {
				await redis.hdel(JOBS_KEY, jobId);
				cleanedCount++;
			}
		}

		return cleanedCount;
	});
}
