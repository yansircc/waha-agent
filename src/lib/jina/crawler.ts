import { env } from "@/env";
import type { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import { getRedisForInstance, safeRedisOperation } from "../redis";
import { sanitizeUrl } from "../utils";
import { processResult } from "./ai-processor";
import {
	JINA_CRAWL_PREFIX,
	JINA_QUEUE_KEY,
	REQUEST_TIMEOUT,
} from "./constants";
import { QueueProcessor } from "./queue-processor";
import type { CrawlJob, JinaCrawlResult } from "./types";

// Options for crawling
interface CrawlOptions {
	useAiCleaning?: boolean; // 是否使用AI清洗内容
	maxRetries?: number; // 最大重试次数
	initialDelay?: number; // 初始重试延迟(ms)
	maxDelay?: number; // 最大重试延迟(ms)
}

// 默认重试选项
const DEFAULT_RETRY_OPTIONS = {
	maxRetries: 3, // 默认最多重试3次
	initialDelay: 1000, // 初始延迟1秒
	maxDelay: 10000, // 最大延迟10秒
	retryStatusCodes: [429, 503, 502, 500, 408, 402], // 需要重试的HTTP状态码
};

/**
 * 等待指定时间的辅助函数
 * @param ms 等待毫秒数
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 计算指数退避延迟时间
 * @param attempt 当前尝试次数
 * @param initialDelay 初始延迟时间
 * @param maxDelay 最大延迟时间
 */
function calculateBackoff(
	attempt: number,
	initialDelay: number,
	maxDelay: number,
): number {
	// 指数退避: initialDelay * 2^(attempt-1) 并添加一些随机抖动
	const exponentialDelay = initialDelay * 2 ** (attempt - 1);
	const jitter = Math.random() * 0.3 * exponentialDelay; // 添加0-30%的随机抖动
	return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Jina网页爬取服务
 */
export class JinaCrawlerService {
	private redis: Redis;
	private jinaApiKey: string;
	private proxyBaseUrl = "https://r.jina.ai/";
	private queueProcessor: QueueProcessor;

	constructor(instanceId?: string) {
		this.redis = getRedisForInstance(instanceId);
		this.jinaApiKey = env.JINA_API_KEY;
		this.queueProcessor = new QueueProcessor(
			this.redis,
			this.crawlUrl.bind(this),
		);
	}

	/**
	 * 添加URL到爬取队列
	 * @param url 需要爬取的URL
	 * @param options 爬取选项
	 * @returns 任务ID
	 */
	public async queueUrl(
		url: string,
		options?: CrawlOptions,
		userId?: string,
	): Promise<string> {
		// Sanitize the URL before processing
		const sanitizedUrl = sanitizeUrl(url);

		// Validate the URL
		try {
			new URL(sanitizedUrl);
		} catch (error) {
			throw new Error(`Invalid URL: ${url}`);
		}

		const jobId = nanoid();
		const job: CrawlJob = {
			id: jobId,
			url: sanitizedUrl,
			timestamp: Date.now(),
			status: "pending",
			options, // 存储爬取选项
			userId, // 存储用户ID
		};

		// 保存任务到Redis并加入队列
		await safeRedisOperation(async () => {
			await this.redis.lpush(JINA_QUEUE_KEY, JSON.stringify(job));
			await this.redis.set(
				`${JINA_CRAWL_PREFIX}:${jobId}`,
				JSON.stringify(job),
			);
		});

		// 触发队列处理
		this.queueProcessor.processQueue().catch(console.error);

		return jobId;
	}

	/**
	 * 批量添加URL到爬取队列
	 * @param urls 需要爬取的URL数组
	 * @param options 爬取选项
	 * @param userId 用户ID
	 * @returns 任务ID数组
	 */
	public async queueUrls(
		urls: string[],
		options?: CrawlOptions,
		userId?: string,
	): Promise<string[]> {
		const jobIds: string[] = [];

		for (const url of urls) {
			const jobId = await this.queueUrl(url, options, userId);
			jobIds.push(jobId);
		}

		return jobIds;
	}

	/**
	 * 获取爬取任务状态
	 * @param jobId 任务ID
	 * @returns 任务状态
	 */
	public async getJobStatus(jobId: string): Promise<CrawlJob | null> {
		const jobData = await this.redis.get(`${JINA_CRAWL_PREFIX}:${jobId}`);

		if (!jobData) return null;

		try {
			if (typeof jobData === "string") {
				return JSON.parse(jobData) as CrawlJob;
			}

			if (typeof jobData === "object" && jobData !== null) {
				return jobData as CrawlJob;
			}

			console.error("Invalid job data type:", typeof jobData);
			return null;
		} catch (error) {
			console.error("解析任务状态失败:", error);
			return null;
		}
	}

	/**
	 * 爬取单个URL，带有重试机制
	 * @param url 要爬取的URL
	 * @param job 任务对象，包含爬取选项
	 * @returns 爬取结果
	 */
	private async crawlUrl(
		url: string,
		job?: CrawlJob,
	): Promise<JinaCrawlResult> {
		// 获取重试选项，合并默认值和自定义选项
		const retryOptions = {
			...DEFAULT_RETRY_OPTIONS,
			...(job?.options || {}),
		};

		// 最大重试次数
		const maxRetries = retryOptions.maxRetries;
		// 当前尝试次数
		let attempt = 0;

		// 循环尝试，直到成功或达到最大重试次数
		while (attempt <= maxRetries) {
			// 确保URL是完整的
			let crawlUrl = url;
			if (!url.startsWith("http")) {
				crawlUrl = this.proxyBaseUrl + url;
			} else {
				crawlUrl = this.proxyBaseUrl + url.replace(/^https?:\/\//, "");
			}

			try {
				// 创建超时控制器
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

				// 记录日志（包含当前尝试次数）
				console.log(
					`开始爬取URL: ${crawlUrl} ${job?.userId ? `(用户: ${job.userId})` : ""} - 尝试 ${attempt + 1}/${maxRetries + 1}`,
				);

				// 发送请求
				const response = await fetch(crawlUrl, {
					headers: {
						Authorization: `Bearer ${this.jinaApiKey}`,
						Accept: "application/json",
						"X-Retain-Images": "none",
						"X-Timeout": "10",
						"X-Token-Budget": "200000",
					},
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				// 检查响应状态
				if (!response.ok) {
					// 如果状态码在需要重试的列表中，且尚未达到最大重试次数，则重试
					if (
						DEFAULT_RETRY_OPTIONS.retryStatusCodes.includes(response.status) &&
						attempt < maxRetries
					) {
						attempt++;
						// 计算延迟时间
						const delayMs = calculateBackoff(
							attempt,
							retryOptions.initialDelay,
							retryOptions.maxDelay,
						);

						console.log(
							`HTTP错误 ${response.status}，将在 ${delayMs}ms 后重试 (${attempt}/${maxRetries})...`,
						);

						// 等待一段时间再重试
						await sleep(delayMs);
						continue; // 继续下一次尝试
					}

					// 超出重试次数或不需要重试的状态码，抛出错误
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				// 获取响应文本
				const responseText = await response.text();

				try {
					// 解析JSON
					const responseData = JSON.parse(responseText);

					// 处理响应
					if (!responseData.data) {
						console.error("Response doesn't contain data field:", responseData);
						throw new Error("无效的响应格式");
					}

					// 确保内容字段以UTF-8编码正确处理
					let content = responseData.data.content || "";
					if (content) {
						const textEncoder = new TextEncoder();
						const encodedContent = textEncoder.encode(content);
						content = new TextDecoder("utf-8").decode(encodedContent);
					}

					let result: JinaCrawlResult = {
						url,
						content: content,
						title: responseData.data.title || "",
						description: responseData.data.description || "",
						timestamp: new Date().toISOString(),
						success: true,
					};

					// 使用AI清洗内容（如果启用）
					if (job?.options?.useAiCleaning) {
						console.log(`使用AI清洗内容: ${url}`);
						result = await processResult(result);
					}

					// 成功，返回结果
					return result;
				} catch (parseError: unknown) {
					// JSON解析错误
					console.error(`JSON解析失败 (${url}):`, parseError);
					console.error("原始响应:", responseText);

					// 如果还有重试次数，继续尝试
					if (attempt < maxRetries) {
						attempt++;
						const delayMs = calculateBackoff(
							attempt,
							retryOptions.initialDelay,
							retryOptions.maxDelay,
						);
						console.log(
							`JSON解析失败，将在 ${delayMs}ms 后重试 (${attempt}/${maxRetries})...`,
						);
						await sleep(delayMs);
						continue;
					}

					throw new Error(
						`JSON解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
					);
				}
			} catch (error) {
				// 处理请求错误
				if (attempt < maxRetries) {
					// 如果还有重试次数，继续尝试
					attempt++;
					const delayMs = calculateBackoff(
						attempt,
						retryOptions.initialDelay,
						retryOptions.maxDelay,
					);
					console.log(
						`爬取URL失败 (${url}): ${error instanceof Error ? error.message : String(error)}, 将在 ${delayMs}ms 后重试 (${attempt}/${maxRetries})...`,
					);
					await sleep(delayMs);
					continue;
				}

				// 最终失败，记录错误并返回失败结果
				console.error(
					`爬取URL最终失败 (${url}) 经过 ${attempt + 1} 次尝试:`,
					error,
				);

				return {
					url,
					content: "",
					title: "",
					description: "",
					timestamp: new Date().toISOString(),
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}

		// 这行代码不应该被执行到，但为了TypeScript类型安全添加
		throw new Error("Unexpected execution path in crawlUrl");
	}

	/**
	 * 立即爬取单个URL（不进入队列，直接执行）
	 * @param url 要爬取的URL
	 * @param options 爬取选项
	 * @returns 爬取结果
	 */
	public async crawlUrlImmediately(
		url: string,
		options?: CrawlOptions,
		userId?: string,
	): Promise<JinaCrawlResult> {
		// 检查速率限制
		const currentRequests = await this.queueProcessor.getCurrentRequestCount();

		if (currentRequests >= 200) {
			// MAX_RPM
			throw new Error(`已达到速率限制(${currentRequests}/200)，请稍后再试`);
		}

		// 增加计数并爬取
		await this.queueProcessor.incrementRequestCount();

		// 创建一个临时job对象以包含选项
		const tempJob: CrawlJob = {
			id: nanoid(),
			url,
			timestamp: Date.now(),
			status: "processing",
			options,
			userId,
		};

		return this.crawlUrl(url, tempJob);
	}
}
