import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	crawlWebpage,
	jinaCrawler,
	queueSitemap,
	queueWebpage,
} from "@/lib/jina-crawler";
import { uploadFileAndGetLink } from "@/lib/s3-service";
import { documents } from "@/server/db/schema";
import { nanoid } from "nanoid";
import { createTRPCRouter, protectedProcedure } from "../trpc";

/**
 * 网页爬取相关的tRPC路由
 */
export const crawlerRouter = createTRPCRouter({
	/**
	 * 立即爬取单个URL
	 */
	crawlUrl: protectedProcedure
		.input(
			z.object({
				url: z.string().url(),
				useAiCleaning: z.boolean().optional().default(true),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const result = await crawlWebpage(input.url, {
					useAiCleaning: input.useAiCleaning,
				});

				return {
					success: result.success,
					url: result.url,
					content: result.content,
					title: result.title,
					description: result.description,
					error: result.error,
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "爬取网页失败",
					cause: error,
				});
			}
		}),

	/**
	 * 将URL添加到爬取队列
	 */
	queueUrl: protectedProcedure
		.input(
			z.object({
				url: z.string().url(),
				useAiCleaning: z.boolean().optional().default(true),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const jobId = await queueWebpage(input.url, {
					useAiCleaning: input.useAiCleaning,
				});

				return {
					success: true,
					message: "URL已添加到爬取队列",
					jobId,
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "添加URL到队列失败",
					cause: error,
				});
			}
		}),

	/**
	 * 从Sitemap添加URL到爬取队列
	 */
	queueSitemap: protectedProcedure
		.input(
			z.object({
				sitemapUrl: z.string().url(),
				useAiCleaning: z.boolean().optional().default(true),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const jobIds = await queueSitemap(input.sitemapUrl, {
					useAiCleaning: input.useAiCleaning,
				});

				return {
					success: true,
					message: "已将Sitemap中的URL添加到爬取队列",
					count: jobIds.length,
					jobIds,
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "处理Sitemap失败",
					cause: error,
				});
			}
		}),

	/**
	 * 获取爬取任务状态
	 */
	getJobStatus: protectedProcedure
		.input(
			z.object({
				jobId: z.string(),
			}),
		)
		.query(async ({ input }) => {
			try {
				const job = await jinaCrawler.getJobStatus(input.jobId);

				if (!job) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "任务未找到",
					});
				}

				return {
					success: true,
					job,
				};
			} catch (error) {
				if (error instanceof TRPCError) throw error;

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "获取任务状态失败",
					cause: error,
				});
			}
		}),

	/**
	 * 获取多个爬取任务状态
	 */
	getBulkJobStatus: protectedProcedure
		.input(
			z.object({
				jobIds: z.array(z.string()),
			}),
		)
		.query(async ({ input }) => {
			try {
				const jobs = await Promise.all(
					input.jobIds.map(async (jobId) => {
						const job = await jinaCrawler.getJobStatus(jobId);
						return job
							? {
									jobId,
									status: job.status,
									result: job.result,
									url: job.url,
									error: job.error,
								}
							: { jobId, status: "not_found" };
					}),
				);

				return {
					success: true,
					jobs: jobs.filter((job) => job !== null),
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error ? error.message : "获取批量任务状态失败",
					cause: error,
				});
			}
		}),

	/**
	 * 批量添加URL到爬取队列
	 */
	queueUrls: protectedProcedure
		.input(
			z.object({
				urls: z.array(z.string().url()),
				useAiCleaning: z.boolean().optional().default(true),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const jobIds: string[] = [];
				const failedUrls: { url: string; error: string }[] = [];

				for (const url of input.urls) {
					try {
						const jobId = await queueWebpage(url, {
							useAiCleaning: input.useAiCleaning,
						});
						jobIds.push(jobId);
					} catch (error) {
						failedUrls.push({
							url,
							error: error instanceof Error ? error.message : "Unknown error",
						});
					}
				}

				return {
					success: true,
					message: `已将 ${jobIds.length} 个 URL 添加到爬取队列`,
					jobIds,
					failed: failedUrls,
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error ? error.message : "批量添加 URL 到队列失败",
					cause: error,
				});
			}
		}),

	/**
	 * 解析 Sitemap 并返回 URL 列表
	 */
	parseSitemap: protectedProcedure
		.input(
			z.object({
				sitemapUrl: z.string().url(),
				useAiCleaning: z.boolean().optional().default(true),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// 使用 Node.js 端的 Sitemapper 库
				const Sitemapper = require("sitemapper");

				// 使用 Set 来确保 URL 唯一性
				const uniqueUrls = new Set<string>();
				const errors: string[] = [];

				async function extractUrls(url: string): Promise<{
					subsitemaps: string[];
					errors: string[];
				}> {
					try {
						const sitemap = new Sitemapper({
							url,
							timeout: 30000,
							retries: 2,
						});

						const { sites } = await sitemap.fetch();

						// 检查是否有子 sitemap
						const subsitemaps = sites.filter(
							(site: string) =>
								site.includes("sitemap") &&
								(site.endsWith(".xml") || site.includes(".xml")),
						);

						// 添加所有非子sitemap的URL到唯一集合
						for (const site of sites) {
							if (!subsitemaps.includes(site)) {
								// 标准化URL（移除尾部斜杠）以避免重复
								const normalizedUrl = site.endsWith("/")
									? site.slice(0, -1)
									: site;
								uniqueUrls.add(normalizedUrl);
							}
						}

						return {
							subsitemaps,
							errors: [],
						};
					} catch (error) {
						return {
							subsitemaps: [],
							errors: [error instanceof Error ? error.message : String(error)],
						};
					}
				}

				// 处理主 sitemap
				const mainResult = await extractUrls(input.sitemapUrl);
				errors.push(...mainResult.errors);

				// 处理子 sitemap（最多处理 5 个子 sitemap 避免过长等待）
				const subsitemapsToProcess = mainResult.subsitemaps.slice(0, 5);
				if (subsitemapsToProcess.length > 0) {
					const subResults = await Promise.all(
						subsitemapsToProcess.map((url) => extractUrls(url)),
					);

					for (const subResult of subResults) {
						errors.push(...subResult.errors);
					}
				}

				// 将 Set 转换为数组
				const urlArray = Array.from(uniqueUrls);

				return {
					success: true,
					urls: urlArray,
					errors,
					count: urlArray.length,
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "解析 Sitemap 失败",
					cause: error,
				});
			}
		}),

	/**
	 * 合并爬取结果并创建单个文档
	 */
	combineAndCreateDocument: protectedProcedure
		.input(
			z.object({
				jobIds: z.array(z.string()),
				sitemapUrl: z.string().url().optional(),
				combinedTitle: z.string(),
				kbId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			try {
				// 首先验证kbId是否存在
				const kb = await ctx.db.query.kbs.findFirst({
					where: (kbs, { eq }) => eq(kbs.id, input.kbId),
				});

				if (!kb) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `知识库不存在，ID: ${input.kbId}`,
					});
				}

				const completedResults: {
					url: string;
					content: string;
					title: string;
				}[] = [];
				const failedJobs: { url: string; error: string }[] = [];

				// 获取每个任务的结果
				for (const jobId of input.jobIds) {
					const job = await jinaCrawler.getJobStatus(jobId);

					if (!job) {
						continue;
					}

					if (job.status === "completed" && job.result && job.result.content) {
						completedResults.push({
							url: job.url,
							content: job.result.content,
							title: job.result.title || job.url,
						});
					} else if (job.status === "failed") {
						failedJobs.push({
							url: job.url,
							error: job.error || "未知错误",
						});
					}
				}

				if (completedResults.length === 0) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "没有成功爬取的内容可以合并",
					});
				}

				// 合并所有内容
				let combinedContent = "";
				for (const result of completedResults) {
					combinedContent += `# ${result.title}\n\nURL: ${result.url}\n\n${result.content}\n\n---\n\n`;
				}

				// 获取域名作为文档标题的一部分
				const domain = input.sitemapUrl
					? new URL(input.sitemapUrl).hostname
					: "网站";

				// 创建一个合并的文档
				const documentId = nanoid();

				// 生成并上传到 S3，获取实际的文件 URL
				const s3Key = `documents/${input.kbId}/${documentId}.md`;

				// 确保内容以UTF-8编码处理
				const textEncoder = new TextEncoder();
				const encodedContent = textEncoder.encode(combinedContent);
				const decodedContent = Buffer.from(encodedContent).toString("utf-8");

				const uploadResult = await uploadFileAndGetLink(
					s3Key,
					decodedContent,
					"text/markdown; charset=utf-8",
				);

				const document = await ctx.db
					.insert(documents)
					.values({
						id: documentId,
						name: input.combinedTitle || `${domain} Sitemap 文档`,
						content: combinedContent,
						fileSize: Buffer.byteLength(combinedContent, "utf8"),
						fileType: "text/markdown",
						kbId: input.kbId,
						vectorizationStatus: "pending",
						createdAt: new Date(),
						updatedAt: new Date(),
						// 使用 S3 文件 URL 而不是 sitemap URL
						fileUrl: uploadResult.fileUrl,
						// Store the original sitemap URL as metadata or in a separate field if needed
						metadata: { originalSource: input.sitemapUrl },
					})
					.returning()
					.execute();

				return {
					success: true,
					document,
					completedCount: completedResults.length,
					failedCount: failedJobs.length,
					totalCount: input.jobIds.length,
				};
			} catch (error) {
				if (error instanceof TRPCError) throw error;

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "合并爬取结果失败",
					cause: error,
				});
			}
		}),
});
