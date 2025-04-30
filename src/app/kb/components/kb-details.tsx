"use client";

import { Button } from "@/components/ui/button";
import type { Document } from "@/types/document";
import type { Kb } from "@/types/kb";
import { FileText, Globe, Plus } from "lucide-react";
import { DocumentTable } from "./document-table";
import { EmptyState } from "./empty-state";

interface KbDetailProps {
	kb: Kb;
	documents: Document[];
	isLoading: boolean;
	isVectorizing?: boolean;
	vectorizingDocId?: string | null;
	onBack: () => void;
	onAddDocument: () => void;
	onCrawlWebpage: () => void;
	onDeleteDocument: (id: string, kbId?: string) => void | Promise<void>;
	onVectorizeDocument: (id: string) => void | Promise<void>;
}

export function KbDetail({
	kb,
	documents,
	isLoading,
	isVectorizing = false,
	vectorizingDocId = null,
	onBack,
	onAddDocument,
	onCrawlWebpage,
	onDeleteDocument,
	onVectorizeDocument,
}: KbDetailProps) {
	// 处理文档删除，确保传递正确的kbId参数
	const handleDeleteDocument = (id: string, kbId: string) => {
		return onDeleteDocument(id, kbId);
	};

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
				<div className="flex space-x-3">
					<Button variant="outline" onClick={onCrawlWebpage}>
						<Globe className="mr-2 h-4 w-4" /> 爬取网页
					</Button>
					<Button onClick={onAddDocument}>
						<Plus className="mr-2 h-4 w-4" /> 添加文档
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="h-52 animate-pulse rounded-md border bg-muted" />
			) : documents.length === 0 ? (
				<EmptyState
					icon={FileText}
					title="没有文档"
					description="添加你的第一个文档到这个知识库，或爬取网页内容。"
					actionLabel="添加文档"
					onAction={onAddDocument}
				/>
			) : (
				<DocumentTable
					documents={documents}
					onDelete={handleDeleteDocument}
					onVectorize={onVectorizeDocument}
					isVectorizing={isVectorizing}
					vectorizingDocId={vectorizingDocId}
				/>
			)}
		</>
	);
}
