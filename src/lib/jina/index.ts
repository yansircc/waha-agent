import { aiProcessor } from "./ai-processor";
import { JinaCrawlerService } from "./crawler";
import type { CrawlOptions, JinaCrawlResult } from "./types";

// Export types
export * from "./types";
export { aiProcessor } from "./ai-processor";

// Export the crawler class
export { JinaCrawlerService } from "./crawler";

// Create singleton instance
export const jinaCrawler = new JinaCrawlerService();

// Export convenience functions
export async function crawlWebpage(
	url: string,
	options?: CrawlOptions,
): Promise<JinaCrawlResult> {
	return jinaCrawler.crawlUrlImmediately(url, options);
}

export async function queueWebpage(
	url: string,
	options?: CrawlOptions,
): Promise<string> {
	return jinaCrawler.queueUrl(url, options);
}

export async function queueSitemap(
	sitemapUrl: string,
	options?: CrawlOptions,
): Promise<string[]> {
	return jinaCrawler.queueFromSitemap(sitemapUrl, options);
}

// Helper function to clean content with AI
export async function cleanContentWithAI(
	content: string,
	title?: string,
): Promise<string> {
	return aiProcessor.cleanContent(content, title);
}
