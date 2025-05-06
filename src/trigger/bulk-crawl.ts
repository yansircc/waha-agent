import { jinaCrawler } from "@/lib/jina";
import { uploadFileAndGetLink } from "@/lib/s3-service";
import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

// 使用 Zod 定义 payload 的架构
const BulkCrawlSchema = z.object({
	urls: z.array(z.string().url()).min(1, "至少需要一个URL"),
	userId: z.string().min(1, "用户ID不能为空"),
	kbId: z.string().default("default"), // 知识库ID，默认值为default
});

type BulkCrawlPayload = z.infer<typeof BulkCrawlSchema>;

// 定义任务返回结果类型
export interface BulkCrawlResult {
	totalCount: number;
	completedCount: number;
	fileUrl: string; // S3文件URL
	filePath: string; // S3文件路径
	fileSize: number; // 文件大小（字节）
	documentIds?: string[]; // 生成的文档ID列表
}

export const bulkCrawl = schemaTask({
	id: "bulk-crawl",
	schema: BulkCrawlSchema,
	retry: {
		maxAttempts: 3, // 整个任务最多重试3次
		factor: 2, // 退避因子
		minTimeoutInMs: 1000,
		maxTimeoutInMs: 30000,
	},
	run: async (payload) => {
		const { urls, userId, kbId } = payload;
		const startTime = Date.now();

		console.log(
			`开始处理 ${urls.length} 个 URL (用户ID: ${userId}, 知识库ID: ${kbId})`,
		);

		// 设置爬取选项，包括重试配置
		const crawlOptions = {
			useAiCleaning: true,
			maxRetries: 3, // 单个URL爬取最多重试4次
			initialDelay: 1500, // 初始延迟1.5秒
			maxDelay: 15000, // 最大延迟15秒
		};

		// 并行爬取所有URL，使用增强的重试配置
		const crawlPromises = urls.map((url) =>
			jinaCrawler.crawlUrlImmediately(url, crawlOptions, userId),
		);

		// 等待所有爬取完成
		const crawlResults = await Promise.all(crawlPromises);

		// 过滤出成功的结果
		const successfulResults = crawlResults.filter((result) => result.success);

		// 合并所有内容为一个Markdown文档
		const combinedContent = successfulResults
			.map((result) => result.content)
			.join("\n\n---\n\n");

		// 确保内容编码正确
		const encodedContent = new TextEncoder().encode(combinedContent);
		const properlyEncodedContent = new TextDecoder("utf-8").decode(
			encodedContent,
		);

		// 计算文件大小（字节）
		const fileSize = new Blob([properlyEncodedContent]).size;

		// 生成文件路径和名称 - 添加随机ID确保唯一性
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const randomId = Math.random().toString(36).substring(2, 8);
		const filePath = `${userId}/${kbId}/${timestamp}-${randomId}.md`;

		// 上传到S3并获取URL
		const { fileUrl } = await uploadFileAndGetLink(
			filePath,
			properlyEncodedContent,
			"text/markdown; charset=utf-8",
		);

		// 计算任务总耗时
		const duration = Date.now() - startTime;
		console.log(
			`爬取任务完成，总耗时: ${duration}ms，成功爬取: ${successfulResults.length}/${urls.length}，文件大小: ${fileSize} 字节`,
		);

		// 返回结果
		return {
			totalCount: urls.length,
			completedCount: successfulResults.length,
			fileUrl,
			filePath,
			fileSize,
		};
	},
});
