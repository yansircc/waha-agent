"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddDocumentDialog } from "./components/add-document-dialog";
import { AddKbDialog } from "./components/add-kb-dialog";
import { KbDetail } from "./components/kb-details";
import { KbList } from "./components/kb-list";
import { WebCrawlerDialog } from "./components/web-crawler/web-crawler-dialog";
import { useKbPage } from "./hooks/use-kb-page";

export default function KnowledgePage() {
	// 使用封装好的hook获取所有状态和处理函数
	const {
		// 状态
		tab,
		selectedKb,
		isAddKbOpen,
		isAddDocOpen,
		isWebCrawlerOpen,
		kbs,
		isLoadingKbs,
		documents,
		isLoadingDocuments,
		isVectorizing,
		vectorizingDocId,

		// Dialog 控制函数
		setIsAddKbOpen,
		setIsAddDocOpen,
		setIsWebCrawlerOpen,

		// 处理函数
		handleOpenAddKbDialog,
		handleSubmitKb,
		handleDeleteKb,
		handleOpenAddDocDialog,
		handleCrawlComplete,
		handleSubmitDoc,
		handleDeleteDocument,
		handleVectorizeDocument,
		handleSelectKb,
		handleBackToList,
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
						onBack={handleBackToList}
						onAddDocument={handleOpenAddDocDialog}
						onCrawlWebpage={() => setIsWebCrawlerOpen(true)}
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

			<WebCrawlerDialog
				open={isWebCrawlerOpen}
				onOpenChange={setIsWebCrawlerOpen}
				onCrawlComplete={handleCrawlComplete}
				kbId={selectedKb?.id}
			/>
		</div>
	);
}
