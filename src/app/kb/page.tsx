"use client";

import { Button } from "@/components/ui/button";
import { QDRANT_COLLECTION_NAME } from "@/lib/constants";
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
		createDocuments,
		deleteDocument,
		getDocumentsByKbId,
		vectorizeDocument,
		vectorizeDocuments,
	} = useDocuments();

	// Knowledge base handlers
	const handleOpenAddKbDialog = () => setIsAddKbOpen(true);

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
		if (confirm("确定要删除这个知识库吗？")) {
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

	const handleSubmitDoc = async (files: File[]) => {
		if (!selectedKb || files.length === 0) return;

		// Use the new multi-file upload function
		const result = await createDocuments({
			kbId: selectedKb.id,
			files,
		});

		// Optionally show a summary of the upload results
		if (result.failed.length > 0) {
			console.warn(`${result.failed.length} 个文件上传失败`, result.failed);
		}

		// Auto-vectorize documents if needed
		if (result.created.length > 0) {
			const shouldVectorize = confirm(
				`已上传 ${result.created.length} 个文档。是否立即向量化这些文档？`,
			);

			if (shouldVectorize) {
				const documentIds = result.created.map((doc) => doc.id);
				await vectorizeDocuments({
					kbId: selectedKb.id,
					documentIds,
					collectionName: QDRANT_COLLECTION_NAME,
				});
			}
		}
	};

	const handleDeleteDocument = async (id: string, kbId: string) => {
		if (confirm("确定要删除这个文档吗？")) {
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
				collectionName: QDRANT_COLLECTION_NAME,
				url: "", // 文档URL现在从后端获取
			});

			// 重新加载文档列表，以获取更新的状态
			await docsQuery.refetch();
		} catch (error) {
			console.error("投喂文档失败:", error);
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
						<h1 className="font-bold text-3xl">知识库</h1>
						<Button onClick={handleOpenAddKbDialog}>
							<Plus className="mr-2 h-4 w-4" /> 添加知识库
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
