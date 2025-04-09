"use client";

import { Button } from "@/components/ui/button";
import type { Document } from "@/types/document";
import type { Kb } from "@/types/kb";
import { FileText, Plus } from "lucide-react";
import { DocumentCard } from "./document-card";
import { EmptyState } from "./empty-state";

interface KbDetailProps {
	kb: Kb;
	documents: Document[];
	isLoading: boolean;
	onBack: () => void;
	onAddDocument: () => void;
	onDeleteDocument: (id: string) => void;
	onVectorizeDocument: (id: string) => void;
}

export function KbDetail({
	kb,
	documents,
	isLoading,
	onBack,
	onAddDocument,
	onDeleteDocument,
	onVectorizeDocument,
}: KbDetailProps) {
	// Loading placeholders
	const loadingPlaceholderIds = [
		"placeholder-1",
		"placeholder-2",
		"placeholder-3",
	];

	return (
		<>
			<div className="mb-4">
				<Button variant="outline" onClick={onBack}>
					&larr; Back to Knowledge Bases
				</Button>
			</div>

			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-3xl">{kb.name}</h1>
					{kb.description && (
						<p className="mt-1 text-muted-foreground">{kb.description}</p>
					)}
				</div>
				<Button onClick={onAddDocument}>
					<Plus className="mr-2 h-4 w-4" /> Add Document
				</Button>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{loadingPlaceholderIds.map((id) => (
						<div
							key={id}
							className="h-48 animate-pulse rounded-lg border bg-muted"
						/>
					))}
				</div>
			) : documents.length === 0 ? (
				<EmptyState
					icon={FileText}
					title="No documents yet"
					description="Add your first document to this knowledge base."
					actionLabel="Add Document"
					onAction={onAddDocument}
				/>
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{documents.map((doc) => (
						<DocumentCard
							key={doc.id}
							document={doc}
							onDelete={onDeleteDocument}
							onVectorize={onVectorizeDocument}
						/>
					))}
				</div>
			)}
		</>
	);
}
