"use client";

import type { BulkCrawlResult } from "@/trigger/bulk-crawl";
import type { Document } from "@/types/document";
import type { Kb } from "@/types/kb";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Extended Document type with crawl-specific fields
interface CrawlDocument extends Document {
	crawlRunId?: string;
	isCrawling?: boolean;
}

interface UseKbDetailParams {
	kb: Kb;
	documents: Document[];
	userId: string;
	onDocumentsCrawled?: (documentIds: string[], output: BulkCrawlResult) => void;
}

/**
 * 提供知识库详情页的状态管理和操作
 */
export function useKbDetail({
	kb,
	documents,
	userId,
	onDocumentsCrawled,
}: UseKbDetailParams) {
	// Crawl state
	const [crawlDialogOpen, setCrawlDialogOpen] = useState(false);
	const [crawlRunId, setCrawlRunId] = useState<string | null>(null);
	const [publicAccessToken, setPublicAccessToken] = useState<string | null>(
		null,
	);
	const [crawlingPlaceholders, setCrawlingPlaceholders] = useState<
		CrawlDocument[]
	>([]);

	// Track crawl task state with useRealtimeRun
	const { run } = useRealtimeRun(crawlRunId || "", {
		accessToken: publicAccessToken || "",
		enabled: !!crawlRunId && !!publicAccessToken,
	});

	// Handle crawl task submission
	const handleCrawlSubmitted = (runId: string, token: string) => {
		setCrawlRunId(runId);
		setPublicAccessToken(token);

		// Create a placeholder document
		const placeholderDoc: CrawlDocument = {
			id: `placeholder-${runId}`,
			name: "爬取网页中...",
			content: "",
			fileType: "text",
			fileSize: 0,
			vectorizationStatus: "pending",
			kbId: kb.id,
			createdAt: new Date(),
			updatedAt: new Date(),
			crawlRunId: runId,
			isCrawling: true,
		};

		setCrawlingPlaceholders((prev) => [...prev, placeholderDoc]);
	};

	// Monitor changes in run status
	useEffect(() => {
		if (!run) return;

		try {
			if (
				run.status === "COMPLETED" &&
				crawlingPlaceholders.some((doc) => doc.crawlRunId === run.id)
			) {
				// Type assertion for run.output
				const output = run.output as unknown as BulkCrawlResult;

				// Remove placeholders
				setCrawlingPlaceholders((placeholders) =>
					placeholders.filter((doc) => doc.crawlRunId !== run.id),
				);

				// Call callback with output results
				if (onDocumentsCrawled) {
					const documentIds = output?.documentIds || [];
					onDocumentsCrawled(documentIds, output);
				}

				// Reset crawl state
				setCrawlRunId(null);
				setPublicAccessToken(null);

				toast.success(`成功爬取 ${output?.completedCount || 0} 个页面`, {
					description: "爬取任务已完成",
				});

				// Set a short delay to prevent duplicate submissions
				setTimeout(() => {
					// Force clear all placeholders and state after document creation
					setCrawlingPlaceholders([]);
					setCrawlRunId(null);
					setPublicAccessToken(null);
				}, 500);
			} else if (run.status === "FAILED") {
				setCrawlingPlaceholders((placeholders) =>
					placeholders.filter((doc) => doc.crawlRunId !== run.id),
				);
				setCrawlRunId(null);
				setPublicAccessToken(null);

				toast.error("爬取失败", {
					description: run.error?.message || "未知错误",
				});
			}
		} catch (error) {
			console.error("Error handling run status update:", error);
		}
	}, [run, crawlingPlaceholders, onDocumentsCrawled]);

	// Safely merge documents and placeholders
	const allDocuments = [...documents, ...crawlingPlaceholders] as Document[];

	return {
		// State
		crawlDialogOpen,
		setCrawlDialogOpen,
		allDocuments,

		// Handlers
		handleCrawlSubmitted,
	};
}
