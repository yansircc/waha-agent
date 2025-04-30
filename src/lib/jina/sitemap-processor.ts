import { parseXml, sanitizeUrl } from "../utils";
import type { CrawlOptions } from "./types";

// Interface for the required crawler methods to avoid circular dependency
export interface CrawlerInterface {
	queueUrls(urls: string[], options?: CrawlOptions): Promise<string[]>;
}

export class SitemapProcessor {
	private crawler: CrawlerInterface;

	constructor(crawler: CrawlerInterface) {
		this.crawler = crawler;
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
		try {
			// 获取sitemap内容
			const response = await fetch(sitemapUrl);
			if (!response.ok) {
				throw new Error(`获取Sitemap失败: ${response.status}`);
			}

			const xmlText = await response.text();

			// First check if this is a sitemap index with multiple sitemaps
			const sitemapUrls = await this.extractUrlsFromSitemap(
				xmlText,
				"sitemap",
				"loc",
				true, // This is a sitemap index, so allow .xml files
			);

			if (sitemapUrls.length > 0) {
				// This is a sitemap index - process each sub-sitemap
				console.log(`发现sitemap索引，包含 ${sitemapUrls.length} 个子sitemap`);

				// Collect all URLs from sub-sitemaps
				const allContentUrls: string[] = [];

				for (const subSitemapUrl of sitemapUrls) {
					try {
						// Get URLs from each sub-sitemap but don't queue them yet
						const response = await fetch(subSitemapUrl);
						if (!response.ok) {
							console.error(`获取子Sitemap失败: ${response.status}`);
							continue;
						}

						const subXmlText = await response.text();
						const subContentUrls = await this.extractUrlsFromSitemap(
							subXmlText,
							"url",
							"loc",
							false, // This is a content sitemap, filter out .xml files
						);

						console.log(
							`从子sitemap抓取到 ${subContentUrls.length} 个URL: ${subSitemapUrl}`,
						);
						allContentUrls.push(...subContentUrls);
					} catch (subError) {
						console.error(`处理子sitemap失败 (${subSitemapUrl}):`, subError);
						// Continue with other sitemaps even if one fails
					}
				}

				// Check if we found any content URLs from sub-sitemaps
				if (allContentUrls.length === 0) {
					console.warn("从所有子Sitemap中未找到任何URL");
					return [];
				}

				console.log(`从所有子sitemap总共抓取到 ${allContentUrls.length} 个URL`);

				// Queue all content URLs at once, passing options
				return this.crawler.queueUrls(allContentUrls, options);
			}

			// Regular sitemap - extract content URLs
			const contentUrls = await this.extractUrlsFromSitemap(
				xmlText,
				"url",
				"loc",
				false, // This is a content sitemap, filter out .xml files
			);

			if (contentUrls.length === 0) {
				console.warn(`Sitemap中未找到任何URL: ${sitemapUrl}`);
				return [];
			}

			console.log(`从sitemap抓取到 ${contentUrls.length} 个URL: ${sitemapUrl}`);

			// 将所有URL加入队列，并传递options
			return this.crawler.queueUrls(contentUrls, options);
		} catch (error) {
			console.error("处理Sitemap失败:", error);
			throw error;
		}
	}

	/**
	 * 从Sitemap XML中提取URL
	 * @param xmlText Sitemap XML内容
	 * @param containerTag 包含URL的外层标签名称 (如 'url' 或 'sitemap')
	 * @param urlTag URL标签名称 (通常是 'loc')
	 * @param isSitemapIndex 是否是sitemap索引文件
	 * @returns URL数组
	 */
	private async extractUrlsFromSitemap(
		xmlText: string,
		containerTag = "url",
		urlTag = "loc",
		isSitemapIndex = false,
	): Promise<string[]> {
		try {
			// 提取URL
			const urls = parseXml(xmlText, urlTag);
			console.log(`从XML中提取到 ${urls.length} 个原始URL`);

			// 对所有URL进行额外清理和验证
			const validUrls = urls.map(sanitizeUrl).filter((url) => {
				// 基本URL验证
				try {
					new URL(url);

					// 如果是sitemap索引，允许.xml文件
					if (!isSitemapIndex) {
						// 排除sitemap XML文件，只保留实际页面URL
						if (url.endsWith(".xml") || url.includes("sitemap")) {
							console.log(`跳过sitemap URL: ${url}`);
							return false;
						}
					}

					return true;
				} catch (error) {
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
}
