"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddDocumentDialog } from "./components/add-document-dialog";
import { AddKbDialog } from "./components/add-kb-dialog";
import { KbDetail } from "./components/kb-details";
import { KbList } from "./components/kb-list";
import { useKbPage } from "./hooks/use-kb-page";

export function KbClient({
	userId,
}: {
	userId: string;
}) {
	// 使用封装好的hook获取所有状态和处理函数
	const {
		// 状态
		tab,
		selectedKb,
		isAddKbOpen,
		isAddDocOpen,
		kbs,
		isLoadingKbs,
		documents,
		isLoadingDocuments,
		isVectorizing,
		vectorizingDocId,

		// Dialog 控制函数
		setIsAddKbOpen,
		setIsAddDocOpen,

		// 处理函数
		handleOpenAddKbDialog,
		handleSubmitKb,
		handleDeleteKb,
		handleOpenAddDocDialog,
		handleSubmitDoc,
		handleDeleteDocument,
		handleVectorizeDocument,
		handleSelectKb,
		handleBackToList,
		handleDocumentsCrawled,
	} = useKbPage();

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
						isVectorizing={isVectorizing}
						vectorizingDocId={vectorizingDocId}
						userId={userId}
						onBack={handleBackToList}
						onAddDocument={handleOpenAddDocDialog}
						onDeleteDocument={(id) => handleDeleteDocument(id, selectedKb.id)}
						onVectorizeDocument={handleVectorizeDocument}
						onDocumentsCrawled={handleDocumentsCrawled}
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
