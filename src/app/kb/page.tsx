"use client";

import { Button } from "@/components/ui/button";
import type { Kb } from "@/types/kb";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AddDocumentDialog } from "./components/add-document-dialog";
import { AddKbDialog } from "./components/add-kb-dialog";
import { KbDetail } from "./components/kb-details";
import { KbList } from "./components/kb-list";
import { useDocuments } from "./hooks/use-documents";
import { useKbs } from "./hooks/use-kbs";

export default function KnowledgePage() {
	// Knowledge base state
	const [isAddKbOpen, setIsAddKbOpen] = useState(false);
	const [selectedKb, setSelectedKb] = useState<Kb | null>(null);

	// Document state
	const [isAddDocOpen, setIsAddDocOpen] = useState(false);

	// View state
	const [tab, setTab] = useState<"list" | "detail">("list");

	// Hooks
	const { kbs, isLoadingKbs, createKb, deleteKb } = useKbs();
	const {
		createDocument,
		deleteDocument,
		getDocumentsByKbId,
		vectorizeDocument,
	} = useDocuments();

	// Knowledge base handlers
	const handleOpenAddKbDialog = () => setIsAddKbOpen(true);
	const handleCloseAddKbDialog = () => setIsAddKbOpen(false);

	const handleSubmitKb = async (data: {
		name: string;
		description: string;
	}) => {
		await createKb({
			name: data.name,
			description: data.description,
			content: "", // Empty content, managed through documents
		});
	};

	const handleDeleteKb = async (id: string) => {
		if (confirm("Are you sure you want to delete this knowledge base?")) {
			await deleteKb(id);
			if (selectedKb?.id === id) {
				setSelectedKb(null);
				setTab("list");
			}
		}
	};

	// Document handlers
	const handleOpenAddDocDialog = () => setIsAddDocOpen(true);
	const handleCloseAddDocDialog = () => setIsAddDocOpen(false);

	const handleSubmitDoc = async (file: File) => {
		if (!selectedKb) return;

		await createDocument({
			name: file.name,
			kbId: selectedKb.id,
			file,
		});
	};

	const handleDeleteDocument = async (id: string, kbId: string) => {
		if (confirm("Are you sure you want to delete this document?")) {
			await deleteDocument(id, kbId);
		}
	};

	const handleVectorizeDocument = async (documentId: string) => {
		if (!selectedKb) return;

		try {
			// 通过API触发向量化
			await vectorizeDocument({
				kbId: selectedKb.id,
				documentId,
				collectionName: "waha", // 使用固定的集合名称
				url: "", // 文档URL现在从后端获取
			});

			// 重新加载文档列表，以获取更新的状态
			await docsQuery.refetch();
		} catch (error) {
			console.error("Failed to vectorize document:", error);
		}
	};

	const handleSelectKb = (kb: Kb) => {
		setSelectedKb(kb);
		setTab("detail");
	};

	const handleBackToList = () => {
		setSelectedKb(null);
		setTab("list");
	};

	// Get documents for the selected knowledge base
	const docsQuery = getDocumentsByKbId(selectedKb?.id);
	const documents = docsQuery.data || [];
	const isLoadingDocuments = docsQuery.isLoading || false;

	return (
		<div className="container py-8">
			{tab === "list" ? (
				<>
					<div className="mb-8 flex items-center justify-between">
						<h1 className="font-bold text-3xl">Knowledge Bases</h1>
						<Button onClick={handleOpenAddKbDialog}>
							<Plus className="mr-2 h-4 w-4" /> Add Knowledge Base
						</Button>
					</div>

					<KbList
						kbs={kbs}
						isLoading={isLoadingKbs}
						onAdd={handleOpenAddKbDialog}
						onDelete={handleDeleteKb}
						onSelect={handleSelectKb}
					/>
				</>
			) : (
				selectedKb && (
					<KbDetail
						kb={selectedKb}
						documents={documents}
						isLoading={isLoadingDocuments}
						onBack={handleBackToList}
						onAddDocument={handleOpenAddDocDialog}
						onDeleteDocument={(id) => handleDeleteDocument(id, selectedKb.id)}
						onVectorizeDocument={handleVectorizeDocument}
					/>
				)
			)}

			<AddKbDialog
				open={isAddKbOpen}
				onOpenChange={setIsAddKbOpen}
				onSubmit={handleSubmitKb}
			/>

			<AddDocumentDialog
				open={isAddDocOpen}
				onOpenChange={setIsAddDocOpen}
				onSubmit={handleSubmitDoc}
			/>
		</div>
	);
}
