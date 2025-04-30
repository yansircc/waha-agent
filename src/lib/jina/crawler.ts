import { env } from "@/env";
import type { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import { getRedisForInstance, safeRedisOperation } from "../redis";
import { sanitizeUrl } from "../utils";
import { aiProcessor } from "./ai-processor";
import {
	JINA_CRAWL_PREFIX,
	JINA_QUEUE_KEY,
	REQUEST_TIMEOUT,
} from "./constants";
import { QueueProcessor } from "./queue-processor";
import { SitemapProcessor } from "./sitemap-processor";
import type { CrawlJob, JinaCrawlResult } from "./types";

// Options for crawling
export interface CrawlOptions {
	useAiCleaning?: boolean; // 是否使用AI清洗内容
}

/**
 * Jina网页爬取服务
 */
export class JinaCrawlerService {
	private redis: Redis;
	private jinaApiKey: string;
	private proxyBaseUrl = "https://r.jina.ai/";
	private queueProcessor: QueueProcessor;
	private sitemapProcessor: SitemapProcessor;

	constructor(instanceId?: string) {
		this.redis = getRedisForInstance(instanceId);
		this.jinaApiKey = env.JINA_API_KEY;
		this.queueProcessor = new QueueProcessor(
			this.redis,
			this.crawlUrl.bind(this),
		);
		this.sitemapProcessor = new SitemapProcessor(this);
	}

	/**
	 * 添加URL到爬取队列
	 * @param url 需要爬取的URL
	 * @param options 爬取选项
	 * @returns 任务ID
	 */
	public async queueUrl(url: string, options?: CrawlOptions): Promise<string> {
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
	 * @returns 任务ID数组
	 */
	public async queueUrls(
		urls: string[],
		options?: CrawlOptions,
	): Promise<string[]> {
		const jobIds: string[] = [];

		for (const url of urls) {
			const jobId = await this.queueUrl(url, options);
			jobIds.push(jobId);
		}

		return jobIds;
	}

	/**
	 * 从Sitemap XML解析URL并加入队列
	 * @param sitemapUrl Sitemap URL
	 * @param options 爬取选项
	 * @returns 任务ID数组
	 */
	public async queueFromSitemap(
		sitemapUrl: string,
		options?: CrawlOptions,
	): Promise<string[]> {
		// Extract URLs from sitemap and pass options
		const urls = await this.sitemapProcessor.queueFromSitemap(
			sitemapUrl,
			options,
		);

		// We no longer need to update job options here since they are passed directly
		// when queueing the URLs through the SitemapProcessor

		return urls;
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
	 * 爬取单个URL
	 * @param url 要爬取的URL
	 * @param job 任务对象，包含爬取选项
	 * @returns 爬取结果
	 */
	private async crawlUrl(
		url: string,
		job?: CrawlJob,
	): Promise<JinaCrawlResult> {
		// 确保URL是完整的
		let crawlUrl = url;
		if (!url.startsWith("http")) {
			crawlUrl = this.proxyBaseUrl + url;
		} else {
			crawlUrl = this.proxyBaseUrl + url.replace(/^https?:\/\//, "");
		}

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

			console.log(`开始爬取URL: ${crawlUrl}`);

			const response = await fetch(crawlUrl, {
				headers: {
					Authorization: `Bearer ${this.jinaApiKey}`,
					Accept: "application/json",
					"X-Retain-Images": "none",
					"X-Timeout": "10", // Reduced from 30 to 10 to match your curl request
					"X-Token-Budget": "200000",
				},
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			// Get the response text first for debugging
			const responseText = await response.text();

			try {
				// Then try to parse it as JSON
				const responseData = JSON.parse(responseText);

				// 处理新的响应结构
				if (!responseData.data) {
					console.error("Response doesn't contain data field:", responseData);
					throw new Error("无效的响应格式");
				}

				// 确保内容字段以UTF-8编码正确处理
				let content = responseData.data.content || "";
				// 如果内容存在，尝试使用TextEncoder/TextDecoder确保编码正确
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

				// 如果启用了AI清洗，进行处理
				if (job?.options?.useAiCleaning) {
					console.log(`使用AI清洗内容: ${url}`);
					result = await aiProcessor.processResult(result);
				}

				return result;
			} catch (parseError: unknown) {
				console.error(`JSON解析失败 (${url}):`, parseError);
				console.error("原始响应:", responseText);
				throw new Error(
					`JSON解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
				);
			}
		} catch (error) {
			console.error(`爬取URL失败 (${url}):`, error);

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

	/**
	 * 立即爬取单个URL（不进入队列，直接执行）
	 * @param url 要爬取的URL
	 * @param options 爬取选项
	 * @returns 爬取结果
	 */
	public async crawlUrlImmediately(
		url: string,
		options?: CrawlOptions,
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
		};

		return this.crawlUrl(url, tempJob);
	}
}
