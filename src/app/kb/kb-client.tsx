"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddDocumentDialog } from "./components/add-document-dialog";
import { AddKbDialog } from "./components/add-kb-dialog";
import { KbDetail } from "./components/kb-details";
import { KbList } from "./components/kb-list";
import { useKbPage } from "./hooks";

export function KbClient({
	userId,
}: {
	userId: string;
}) {
	// Use the refactored hook for all KB page functionality
	const {
		// States
		activeTab,
		selectedKb,
		isAddKbOpen,
		isAddDocOpen,
		kbs,
		isLoadingKbs,
		documents,
		isLoadingDocuments,
		isProcessing,

		// Dialog control functions
		setIsAddKbOpen,
		setIsAddDocOpen,

		// Handler functions
		handleOpenAddKbDialog,
		handleSubmitKb,
		handleDeleteKb,
		handleOpenAddDocDialog,
		handleCloseAddDocDialog,
		handleSubmitDoc,
		handleDeleteDocument,
		handleVectorizeDocument,
		handleSelectKb,
		handleBackToList,
		handleDocumentsCrawled,
	} = useKbPage();

	return (
		<div className="container py-8">
			{activeTab === "list" ? (
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
						isVectorizing={isProcessing}
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
