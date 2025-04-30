"use client";

import { useCallback, useState } from "react";
import type {
	CrawlResult,
	TabType,
} from "../../components/web-crawler/utils/types";

// Web Crawler Dialog Hook
export function useWebCrawlerDialog(
	onOpenChange: (open: boolean) => void,
	onCrawlComplete: (
		content: string,
		title: string,
		description?: string,
		fileUrl?: string,
	) => Promise<void>,
) {
	const [tab, setTab] = useState<TabType>("url");
	const [jobId, setJobId] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<CrawlResult>({});

	// 处理对话框关闭
	const handleClose = useCallback(() => {
		if (!isLoading) {
			onOpenChange(false);
			// 重置状态
			setJobId("");
			setResult({});
			setTab("url");
		}
	}, [isLoading, onOpenChange]);

	return {
		tab,
		setTab,
		jobId,
		setJobId,
		isLoading,
		setIsLoading,
		result,
		setResult,
		handleClose,
	};
}
