import type { Redis } from "@upstash/redis";
import { parseJsonValueIfNeeded, safeRedisOperation } from "../redis";
import {
	JINA_CRAWL_PREFIX,
	JINA_QUEUE_KEY,
	JINA_RATE_LIMIT_KEY,
	MAX_CONCURRENT_TASKS,
	MAX_RPM,
} from "./constants";
import type { CrawlJob, JinaCrawlResult } from "./types";

export class QueueProcessor {
	private redis: Redis;
	private activeTasks = 0;
	private processing = false;
	private concurrentLimit = MAX_CONCURRENT_TASKS;
	private crawlUrlFn: (url: string, job?: CrawlJob) => Promise<JinaCrawlResult>;

	constructor(
		redis: Redis,
		crawlUrlFn: (url: string, job?: CrawlJob) => Promise<JinaCrawlResult>,
	) {
		this.redis = redis;
		this.crawlUrlFn = crawlUrlFn;
	}

	/**
	 * 处理爬取队列
	 */
	public async processQueue(): Promise<void> {
		// 避免多个实例同时处理
		if (this.processing) return;

		this.processing = true;

		try {
			// 持续处理队列，直到无法继续
			while (true) {
				// 检查当前分钟内的请求数
				const currentRequests = await this.getCurrentRequestCount();

				// 如果已达到速率限制或达到并发上限，则暂停一段时间
				if (
					currentRequests >= MAX_RPM ||
					this.activeTasks >= this.concurrentLimit
				) {
					console.log(
						`暂停队列处理: 速率${currentRequests}/${MAX_RPM}, 并发${this.activeTasks}/${this.concurrentLimit}`,
					);

					// 如果有活跃任务，等待它们完成一部分后再继续
					if (this.activeTasks > 0) {
						await new Promise((resolve) => setTimeout(resolve, 1000));
						continue;
					}

					break;
				}

				// 获取多个任务（最多获取当前可处理的数量）
				const availableSlots = Math.min(
					MAX_RPM - currentRequests,
					this.concurrentLimit - this.activeTasks,
				);

				if (availableSlots <= 0) break;

				// 尝试获取多个任务
				const tasks: CrawlJob[] = [];
				for (let i = 0; i < availableSlots; i++) {
					const nextJobData = await safeRedisOperation(() =>
						this.redis.rpop(JINA_QUEUE_KEY),
					);

					if (!nextJobData) break;

					// 解析任务数据
					const parsedJob = parseJsonValueIfNeeded(nextJobData);
					if (typeof parsedJob !== "object" || parsedJob === null) {
						console.error(`无效的任务数据类型: ${typeof parsedJob}`);
						continue;
					}

					const job = parsedJob as CrawlJob;

					// 验证必要字段
					if (!job.id || !job.url) {
						console.error("任务数据缺少必要字段", { job });
						continue;
					}

					tasks.push(job);
				}

				// 如果没有获取到任何任务，退出循环
				if (tasks.length === 0) break;

				// 更新获取到的任务状态为处理中
				for (const job of tasks) {
					job.status = "processing";
					await this.updateJobStatus(job);
				}

				// 并发处理任务
				this.activeTasks += tasks.length;
				await this.incrementRequestCount(tasks.length);

				// 启动并发任务
				for (const job of tasks) {
					this.processTask(job).catch(console.error);
				}
			}
		} finally {
			// 如果没有活跃任务，则完全退出处理
			if (this.activeTasks === 0) {
				this.processing = false;
			} else {
				// 否则，当前批次处理完毕后启动新的处理周期
				setTimeout(() => {
					this.processing = false;
					this.processQueue().catch(console.error);
				}, 1000);
			}
		}
	}

	/**
	 * 处理单个爬取任务
	 */
	private async processTask(job: CrawlJob): Promise<void> {
		try {
			// 执行爬取
			const result = await this.crawlUrlFn(job.url, job);

			// 更新任务状态为完成
			job.status = "completed";
			job.result = result;
		} catch (error) {
			// 更新任务状态为失败
			job.status = "failed";
			job.error = error instanceof Error ? error.message : String(error);
		} finally {
			// 更新状态并减少活跃任务计数
			await this.updateJobStatus(job);
			this.activeTasks--;

			// 如果队列处理被暂停，且活跃任务数低于阈值，尝试重新启动处理
			if (!this.processing && this.activeTasks < this.concurrentLimit / 2) {
				this.processQueue().catch(console.error);
			}
		}
	}

	/**
	 * 更新任务状态
	 * @param job 任务对象
	 */
	public async updateJobStatus(job: CrawlJob): Promise<void> {
		await safeRedisOperation(() =>
			this.redis.set(`${JINA_CRAWL_PREFIX}:${job.id}`, JSON.stringify(job)),
		);
	}

	/**
	 * 获取当前分钟内的请求计数
	 * @returns 请求计数
	 */
	public async getCurrentRequestCount(): Promise<number> {
		const currentMinute = this.getCurrentMinuteKey();
		const count = await safeRedisOperation(() =>
			this.redis.get(`${JINA_RATE_LIMIT_KEY}:${currentMinute}`),
		);

		return count ? Number(count) : 0;
	}

	/**
	 * 增加请求计数
	 * @param count 增加的数量，默认为1
	 */
	public async incrementRequestCount(count = 1): Promise<void> {
		const currentMinute = this.getCurrentMinuteKey();
		await safeRedisOperation(async () => {
			// 增加指定数量
			await this.redis.incrby(`${JINA_RATE_LIMIT_KEY}:${currentMinute}`, count);
			// 设置60秒过期，自动清理计数器
			await this.redis.expire(`${JINA_RATE_LIMIT_KEY}:${currentMinute}`, 60);
		});
	}

	/**
	 * 获取当前分钟的键名
	 * @returns 格式为 YYYY-MM-DD-HH-MM 的字符串
	 */
	private getCurrentMinuteKey(): string {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
	}
}
