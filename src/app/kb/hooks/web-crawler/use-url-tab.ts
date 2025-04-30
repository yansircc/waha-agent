"use client";

import { api } from "@/utils/api";
import { useState } from "react";
import type { CrawlResult } from "../../components/web-crawler/utils/types";

// URL Tab Hook
export function useUrlTab(
	onCrawlComplete: (
		content: string,
		title: string,
		description?: string,
		fileUrl?: string,
	) => Promise<void>,
	setJobId: (jobId: string) => void,
	setIsLoading: (loading: boolean) => void,
) {
	const [url, setUrl] = useState("");
	const [queueOnly, setQueueOnly] = useState(false);
	const [useAiCleaning, setUseAiCleaning] = useState(true);
	const [result, setResult] = useState<CrawlResult>({});

	// tRPC mutations
	const crawlUrlMutation = api.crawler.crawlUrl.useMutation();
	const queueUrlMutation = api.crawler.queueUrl.useMutation();

	// 处理URL提交
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setResult({});

		try {
			if (queueOnly) {
				// 将URL添加到队列中稍后爬取
				const queueResult = await queueUrlMutation.mutateAsync({
					url,
					useAiCleaning,
				});

				setResult({
					message: queueResult.message,
					jobId: queueResult.jobId,
				});

				setJobId(queueResult.jobId);
			} else {
				// 立即爬取URL
				const crawlResult = await crawlUrlMutation.mutateAsync({
					url,
					useAiCleaning,
				});

				setResult({
					content: crawlResult.content,
					title: crawlResult.title,
					description: crawlResult.description,
					error: crawlResult.error,
				});

				if (crawlResult.success && crawlResult.content && onCrawlComplete) {
					// Pass the URL as fileUrl since the server doesn't return a fileUrl for direct crawl
					await onCrawlComplete(
						crawlResult.content,
						crawlResult.title || url,
						crawlResult.description,
						url, // For direct crawls, use the original URL
					);
				} else if (crawlResult.error) {
					// Keep dialog open to show error
				} else {
					// Keep dialog open if successful but no onCrawlComplete (e.g., just displaying)
				}
			}
		} catch (error) {
			console.error("爬取错误:", error);
			setResult({
				error: error instanceof Error ? error.message : "操作失败，请重试",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return {
		url,
		setUrl,
		queueOnly,
		setQueueOnly,
		useAiCleaning,
		setUseAiCleaning,
		result,
		handleSubmit,
	};
}
