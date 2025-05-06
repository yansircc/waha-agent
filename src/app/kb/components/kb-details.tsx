// src/app/kb/components/kb-details.tsx
"use client";

import { Button } from "@/components/ui/button";
import type { BulkCrawlResult } from "@/trigger/bulk-crawl";
import type { Document } from "@/types/document";
import type { Kb } from "@/types/kb";
import { FileText, Globe, Plus } from "lucide-react";
import { useKbDetail } from "../hooks/use-kb-detail";
import { CrawlWebpageDialog } from "./crawl-webpage-dialog";
import { DocumentTable } from "./document-table";
import { EmptyState } from "./empty-state";

interface KbDetailProps {
	kb: Kb;
	documents: Document[];
	isLoading: boolean;
	isVectorizing?: boolean;
	userId: string;
	onBack: () => void;
	onAddDocument: () => void;
	onDeleteDocument: (id: string, kbId?: string) => void | Promise<void>;
	onVectorizeDocument: (id: string) => void | Promise<void>;
	onDocumentsCrawled?: (documentIds: string[], output: BulkCrawlResult) => void;
}

export function KbDetail({
	kb,
	documents,
	isLoading,
	isVectorizing = false,
	userId,
	onBack,
	onAddDocument,
	onDeleteDocument,
	onVectorizeDocument,
	onDocumentsCrawled,
}: KbDetailProps) {
	// 使用提取出的钩子获取状态和处理函数
	const {
		crawlDialogOpen,
		setCrawlDialogOpen,
		allDocuments,
		handleCrawlSubmitted,
	} = useKbDetail({
		kb,
		documents,
		userId,
		onDocumentsCrawled,
	});

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

			<DocumentTable
				documents={allDocuments}
				onDelete={onDeleteDocument}
				onVectorize={onVectorizeDocument}
				isVectorizing={isVectorizing}
			/>

			<CrawlWebpageDialog
				open={crawlDialogOpen}
				onOpenChange={setCrawlDialogOpen}
				userId={userId}
				kbId={kb.id}
				onCrawlSubmitted={handleCrawlSubmitted}
			/>
		</>
	);
}
