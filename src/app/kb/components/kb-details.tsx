// src/app/kb/components/kb-details.tsx
"use client";

import { Button } from "@/components/ui/button";
import type { bulkCrawl } from "@/trigger/bulk-crawl";
import type { Document } from "@/types/document";
import type { Kb } from "@/types/kb";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { FileText, Globe, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CrawlWebpageDialog } from "./crawl-webpage-dialog";
import { DocumentTable } from "./document-table";
import { EmptyState } from "./empty-state";

// 扩展Document类型以包含爬取特定字段
interface CrawlDocument extends Document {
	crawlRunId?: string;
	isCrawling?: boolean;
}

// 定义bulkCrawl的预期输出
interface BulkCrawlOutput {
	totalCount: number;
	completedCount: number;
	fileUrl: string;
	filePath: string;
	fileSize: number;
	documentIds?: string[];
}

interface KbDetailProps {
	kb: Kb;
	documents: Document[];
	isLoading: boolean;
	isVectorizing?: boolean;
	vectorizingDocId?: string | null;
	publicAccessToken: string;
	userId: string;
	onBack: () => void;
	onAddDocument: () => void;
	onDeleteDocument: (id: string, kbId?: string) => void | Promise<void>;
	onVectorizeDocument: (id: string) => void | Promise<void>;
	onDocumentsCrawled?: (documentIds: string[], output: BulkCrawlOutput) => void;
}

export function KbDetail({
	kb,
	documents,
	isLoading,
	isVectorizing = false,
	vectorizingDocId = null,
	publicAccessToken,
	userId,
	onBack,
	onAddDocument,
	onDeleteDocument,
	onVectorizeDocument,
	onDocumentsCrawled,
}: KbDetailProps) {
	const [crawlDialogOpen, setCrawlDialogOpen] = useState(false);
	const [crawlRunId, setCrawlRunId] = useState<string | null>(null);
	const [crawlingPlaceholders, setCrawlingPlaceholders] = useState<
		CrawlDocument[]
	>([]);

	// 处理爬取任务提交
	const handleCrawlSubmitted = (runId: string) => {
		setCrawlRunId(runId);

		// 创建一个占位文档
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

		toast.success("爬取任务已提交", {
			description: "系统正在后台爬取网页，请稍候...",
		});
	};

	// 使用useRealtimeRun跟踪爬取任务状态
	const { run } = useRealtimeRun<typeof bulkCrawl>(crawlRunId || "", {
		accessToken: publicAccessToken,
		enabled: !!crawlRunId,
	});

	// 监控run状态的变化
	useEffect(() => {
		if (!run) return;

		try {
			if (
				run.status === "COMPLETED" &&
				crawlingPlaceholders.some((doc) => doc.crawlRunId === run.id)
			) {
				// 类型断言为run.output
				const output = run.output as unknown as BulkCrawlOutput;

				// 移除占位符
				setCrawlingPlaceholders((placeholders) =>
					placeholders.filter((doc) => doc.crawlRunId !== run.id),
				);

				// 调用回调并传递输出结果
				if (onDocumentsCrawled) {
					const documentIds = output?.documentIds || [];
					onDocumentsCrawled(documentIds, output);
				}

				// 重置爬取状态
				setCrawlRunId(null);

				toast.success(`成功爬取 ${output?.completedCount || 0} 个页面`, {
					description: "爬取任务已完成",
				});

				// 设置短暂延迟，防止重复提交相同的爬取任务
				setTimeout(() => {
					// 创建完文档后，强制清空所有占位符和状态
					setCrawlingPlaceholders([]);
					setCrawlRunId(null);
				}, 500);
			} else if (run.status === "FAILED") {
				setCrawlingPlaceholders((placeholders) =>
					placeholders.filter((doc) => doc.crawlRunId !== run.id),
				);
				setCrawlRunId(null);

				toast.error("爬取失败", {
					description: run.error?.message || "未知错误",
				});
			}
		} catch (error) {
			console.error("Error handling run status update:", error);
		}
	}, [run, crawlingPlaceholders, onDocumentsCrawled]);

	// 处理文档删除
	const handleDeleteDocument = (id: string, kbId: string) => {
		return onDeleteDocument(id, kbId);
	};

	// 安全地合并文档和占位符
	const allDocuments = [...documents, ...crawlingPlaceholders] as Document[];

	return (
		<>
			<div className="mb-4">
				<Button variant="outline" onClick={onBack}>
					&larr; 返回知识库
				</Button>
			</div>

			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-3xl">{kb.name}</h1>
					{kb.description && (
						<p className="mt-1 text-muted-foreground">{kb.description}</p>
					)}
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => setCrawlDialogOpen(true)}>
						<Globe className="mr-2 h-4 w-4" /> 爬取网页
					</Button>
					<Button onClick={onAddDocument}>
						<Plus className="mr-2 h-4 w-4" /> 添加文档
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="h-52 animate-pulse rounded-md border bg-muted" />
			) : allDocuments.length === 0 ? (
				<EmptyState
					icon={FileText}
					title="没有文档"
					description="添加你的第一个文档到这个知识库。"
					actionLabel="添加文档"
					onAction={onAddDocument}
				/>
			) : (
				<DocumentTable
					documents={allDocuments}
					onDelete={handleDeleteDocument}
					onVectorize={onVectorizeDocument}
					isVectorizing={isVectorizing}
					vectorizingDocId={vectorizingDocId}
				/>
			)}

			<CrawlWebpageDialog
				open={crawlDialogOpen}
				onOpenChange={setCrawlDialogOpen}
				publicAccessToken={publicAccessToken}
				userId={userId}
				kbId={kb.id}
				onCrawlSubmitted={handleCrawlSubmitted}
			/>
		</>
	);
}
