import { bulkCrawl } from "@/trigger/bulk-crawl";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const crawlRouter = createTRPCRouter({
	triggerBulkCrawl: protectedProcedure
		.input(
			z.object({
				urls: z.array(z.string().url()),
				userId: z.string(),
				kbId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// Trigger the bulk crawl task
				const handle = await bulkCrawl.trigger({ ...input });

				// Create a public access token specific to this run
				const publicAccessToken = await triggerAuth.createPublicToken({
					scopes: {
						read: {
							runs: [handle.id],
						},
					},
				});

				return {
					success: true,
					handle,
					token: publicAccessToken,
				};
			} catch (error) {
				console.error("[tRPC] Error triggering bulk crawl task:", error);
				throw new Error("Failed to trigger bulk crawl task");
			}
		}),

	fetchSitemap: protectedProcedure
		.input(
			z.object({
				sitemapUrl: z.string().url(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const { sitemapUrl } = input;

				// 1. 处理sitemap (可能递归处理sitemap索引)
				const allUrls = await processSitemap(sitemapUrl);

				// 2. 进行URL去重
				const uniqueUrls = [...new Set(allUrls)];

				return {
					success: true,
					urls: uniqueUrls,
					count: uniqueUrls.length,
				};
			} catch (error) {
				console.error("[tRPC] Error fetching sitemap:", error);
				throw new Error(
					error instanceof Error ? error.message : "Failed to process sitemap",
				);
			}
		}),
});

// 处理单个sitemap URL (可能是sitemap索引)
async function processSitemap(sitemapUrl: string): Promise<string[]> {
	try {
		// 获取XML内容
		console.log(`获取sitemap: ${sitemapUrl}`);
		const response = await fetch(sitemapUrl, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; SitemapFetcher/1.0)",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
		}

		const xmlText = await response.text();

		// 检查是sitemap还是sitemap索引
		const isSitemapIndex = xmlText.includes("<sitemapindex");

		if (!xmlText.includes("<urlset") && !isSitemapIndex) {
			throw new Error("The provided URL does not contain a valid sitemap XML");
		}

		// 如果是sitemap索引，需要递归处理每个子sitemap
		if (isSitemapIndex) {
			console.log(`处理sitemap索引: ${sitemapUrl}`);
			return await processSitemapIndex(xmlText);
		}

		// 如果是普通sitemap，直接提取URL
		console.log(`处理普通sitemap: ${sitemapUrl}`);
		return extractUrlsFromSitemap(xmlText, false);
	} catch (error) {
		console.error(`处理sitemap失败 ${sitemapUrl}:`, error);
		throw error;
	}
}

// 处理sitemap索引文件
async function processSitemapIndex(xmlText: string): Promise<string[]> {
	try {
		// 从索引中提取所有子sitemap的URL
		const sitemapUrls = extractUrlsFromSitemap(xmlText, true);
		console.log(`从索引中提取到 ${sitemapUrls.length} 个子sitemap`);

		if (sitemapUrls.length === 0) {
			return [];
		}

		// 限制并发请求数量，避免过多请求
		const maxConcurrentRequests = 3;
		const results: string[][] = [];

		// 分批处理子sitemap
		for (let i = 0; i < sitemapUrls.length; i += maxConcurrentRequests) {
			const batch = sitemapUrls.slice(i, i + maxConcurrentRequests);
			const batchPromises = batch.map((url) => processSitemap(url));

			// 等待当前批次完成
			const batchResults = await Promise.allSettled(batchPromises);

			// 收集成功结果
			batchResults.forEach((result, index) => {
				if (result.status === "fulfilled") {
					results.push(result.value);
				} else {
					console.error(`处理子sitemap失败 ${batch[index]}:`, result.reason);
				}
			});
		}

		// 合并所有URL
		return results.flat();
	} catch (error) {
		console.error("处理sitemap索引失败:", error);
		return [];
	}
}

// 从Sitemap XML中提取URL
function extractUrlsFromSitemap(
	xmlText: string,
	isSitemapIndex: boolean,
): string[] {
	try {
		// 提取URL，sitemap索引和常规sitemap使用相同的<loc>标签
		const urls = parseXml(xmlText, "loc");
		console.log(`从XML中提取到 ${urls.length} 个原始URL`);

		// 对所有URL进行额外清理和验证
		const validUrls = urls.map(sanitizeUrl).filter((url) => {
			// 基本URL验证
			try {
				new URL(url);

				// 如果是sitemap索引，我们需要保留xml文件的URL
				if (!isSitemapIndex) {
					// 仅当不是索引处理时过滤掉sitemap XML URL
					if (url.endsWith(".xml") || url.includes("sitemap")) {
						console.log(`跳过sitemap URL: ${url}`);
						return false;
					}
				}

				return true;
			} catch (_error) {
				console.warn(`无效的URL: ${url}`);
				return false;
			}
		});

		console.log(`过滤后剩余有效URL: ${validUrls.length} 个`);
		return validUrls;
	} catch (error) {
		console.error("解析Sitemap XML失败:", error);
		return [];
	}
}

// 解析XML中的URL标签内容
function parseXml(xml: string, tagName: string): string[] {
	const regex = new RegExp(`<${tagName}[^>]*>(.*?)</${tagName}>`, "g");
	const matches = [...xml.matchAll(regex)];
	return matches.map((match) => match[1]?.trim() || "").filter(Boolean);
}

// 清理和验证URL
function sanitizeUrl(url: string): string {
	return url.trim().replace(/&amp;/g, "&");
}
