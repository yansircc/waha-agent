"use client";

import { QDRANT_COLLECTION_NAME } from "@/lib/constants";
import type { BulkCrawlResult } from "@/trigger/bulk-crawl";
import type { Kb } from "@/types/kb";
import { useKbStore } from "./store";
import { useDocumentApi } from "./use-document-api";
import { useKbApi } from "./use-kb-api";

/**
 * Unified hook for knowledge base page functionality
 * Combines all hooks into a single interface for the KB page
 */
export function useKbPage() {
	// Get global state from store
	const selectedKb = useKbStore((state) => state.selectedKb);
	const setSelectedKb = useKbStore((state) => state.setSelectedKb);
	const isAddKbOpen = useKbStore((state) => state.isAddKbOpen);
	const setIsAddKbOpen = useKbStore((state) => state.setIsAddKbOpen);
	const isAddDocOpen = useKbStore((state) => state.isAddDocOpen);
	const setIsAddDocOpen = useKbStore((state) => state.setIsAddDocOpen);
	const activeTab = useKbStore((state) => state.activeTab);
	const setActiveTab = useKbStore((state) => state.setActiveTab);

	// API hooks
	const { kbs, isLoadingKbs, createKb, deleteKb } = useKbApi();

	const {
		getDocumentsByKbId,
		createDocument,
		createDocuments,
		deleteDocument,
		vectorizeDocument,
		vectorizeDocuments,
		processDocumentsCrawled,
		isLoading: isLoadingDocuments,
		isProcessing,
	} = useDocumentApi();

	// Get documents for the selected knowledge base
	const docsQuery = getDocumentsByKbId(selectedKb?.id);
	const documents = docsQuery.data || [];

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
		if (confirm("Are you sure you want to delete this knowledge base?")) {
			await deleteKb(id);
		}
	};

	// Document handlers
	const handleOpenAddDocDialog = () => setIsAddDocOpen(true);
	const handleCloseAddDocDialog = () => setIsAddDocOpen(false);

	const handleSubmitDoc = async (files: File[]) => {
		if (!selectedKb || files.length === 0) return;

		// Use multi-file upload
		const result = await createDocuments({
			kbId: selectedKb.id,
			files,
		});

		// Optionally display upload results summary
		if (result.failed.length > 0) {
			console.warn(
				`${result.failed.length} files failed to upload`,
				result.failed,
			);
		}

		// Auto-vectorize documents (with confirmation)
		if (result.created.length > 0) {
			const shouldVectorize = confirm(
				`${result.created.length} documents uploaded. Vectorize these documents now?`,
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
		// UI layer's AlertDialog will handle confirmation
		await deleteDocument(id, kbId);
	};

	const handleVectorizeDocument = async (documentId: string) => {
		if (!selectedKb) return;

		try {
			// Trigger document vectorization
			await vectorizeDocument({
				kbId: selectedKb.id,
				documentId,
				collectionName: QDRANT_COLLECTION_NAME,
			});

			// Refresh document list to get updated status
			await docsQuery.refetch();
		} catch (error) {
			console.error("Failed to vectorize document:", error);
		}
	};

	const handleSelectKb = (kb: Kb) => {
		setSelectedKb(kb);
		setActiveTab("detail");
	};

	const handleBackToList = () => {
		setSelectedKb(null);
		setActiveTab("list");
	};

	const handleDocumentsCrawled = async (
		documentIds: string[],
		crawlOutput?: BulkCrawlResult,
	) => {
		if (selectedKb) {
			await processDocumentsCrawled(selectedKb.id, documentIds, crawlOutput);
		}
	};

	return {
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
	};
}
