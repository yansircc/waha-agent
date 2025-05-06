"use client";

import type { Document } from "@/types/document";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useKbStore } from "./store";

interface UseDocumentTableProps {
	documents: Document[];
	onDelete: (id: string, kbId: string) => void | Promise<void>;
	onVectorize: (id: string) => void | Promise<void>;
}

/**
 * Hook for document table functionality
 */
export function useDocumentTable({
	documents,
	onDelete,
	onVectorize,
}: UseDocumentTableProps): {
	localDocuments: Document[];
	documentToDelete: Document | null;
	isProcessing: (document: Document) => boolean;
	isPending: (document: Document) => boolean;
	isFailed: (document: Document) => boolean;
	isCompleted: (document: Document) => boolean;
	isDeleting: (document: Document) => boolean;
	handleVectorize: (document: Document) => Promise<void>;
	confirmDelete: (document: Document) => void;
	executeDelete: (document: Document) => Promise<void>;
	cancelDelete: () => void;
	openFile: (fileUrl: string | null | undefined) => void;
} {
	// Get state from store
	const processingDocIds = useKbStore((state) => state.processingDocIds);
	const deletingDocIds = useKbStore((state) => state.deletingDocIds);
	const documentToDelete = useKbStore((state) => state.documentToDelete);
	const setDocumentToDelete = useKbStore((state) => state.setDocumentToDelete);
	const addProcessingDocId = useKbStore((state) => state.addProcessingDocId);
	const documentVectorizationRuns = useKbStore(
		(state) => state.documentVectorizationRuns,
	);

	// Sort documents by date, newest first - define this before using it
	const sortDocumentsByDate = useCallback((docs: Document[]): Document[] => {
		return [...docs].sort((a, b) => {
			// Handle potentially empty dates
			const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
			const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
			return dateB.getTime() - dateA.getTime(); // Descending order, newest first
		});
	}, []);

	// Keep local documents sorted by creation date
	const [localDocuments, setLocalDocuments] = useState<Document[]>(() =>
		sortDocumentsByDate(documents),
	);

	// Sync local documents when props update
	useEffect(() => {
		// Compare documents and localDocuments for substantial differences
		const needsUpdate =
			documents.length !== localDocuments.length ||
			documents.some((doc) => {
				const localDoc = localDocuments.find((local) => local.id === doc.id);
				return (
					!localDoc || localDoc.vectorizationStatus !== doc.vectorizationStatus
				);
			});

		if (needsUpdate) {
			setLocalDocuments(sortDocumentsByDate(documents));
		}
	}, [documents, localDocuments, sortDocumentsByDate]);

	// Handle vectorization request
	const handleVectorize = async (document: Document) => {
		// If already processing, don't duplicate
		if (isProcessing(document)) {
			return;
		}

		// Update processing state
		addProcessingDocId(document.id);

		try {
			await onVectorize(document.id);

			// Update local documents to show processing state
			setLocalDocuments((prevDocs) =>
				prevDocs.map((doc) =>
					doc.id === document.id
						? { ...doc, vectorizationStatus: "processing" }
						: doc,
				),
			);
		} catch (error) {
			toast.error("Vectorization request failed, please try again");
		}
	};

	// Open file in new tab
	const openFile = (fileUrl: string | null | undefined) => {
		if (fileUrl) {
			window.open(fileUrl, "_blank");
		} else {
			toast.error("File URL not available");
		}
	};

	// Delete confirmation dialog
	const confirmDelete = (document: Document) => {
		setDocumentToDelete(document);
	};

	// Execute document deletion
	const executeDelete = async (document: Document) => {
		if (!document.kbId) return;

		try {
			await onDelete(document.id, document.kbId);
			// Parent component will handle removing from list
		} catch (error) {
			toast.error("Failed to delete document");
		} finally {
			setDocumentToDelete(null);
		}
	};

	// Cancel document deletion
	const cancelDelete = () => {
		setDocumentToDelete(null);
	};

	// Check if document is being processed
	const isProcessing = (document: Document) => {
		// Check processingDocIds
		if (processingDocIds.has(document.id)) {
			return true;
		}

		// Check document status
		if (document.vectorizationStatus === "processing") {
			return true;
		}

		// Check vectorization runs
		return !!documentVectorizationRuns[document.id];
	};

	// Check if document is pending processing
	const isPending = (document: Document) => {
		return (
			document.vectorizationStatus === "pending" ||
			!document.vectorizationStatus
		);
	};

	// Check if document vectorization failed
	const isFailed = (document: Document) => {
		return document.vectorizationStatus === "failed";
	};

	// Check if document vectorization completed
	const isCompleted = (document: Document) => {
		return (
			document.vectorizationStatus === "vectorized" ||
			document.vectorizationStatus === "completed"
		);
	};

	// Check if document is being deleted
	const isDeleting = (document: Document) => {
		return deletingDocIds.has(document.id);
	};

	// Ensure returned localDocuments are always sorted
	const sortedLocalDocuments = useMemo(() => {
		return sortDocumentsByDate(localDocuments);
	}, [localDocuments, sortDocumentsByDate]);

	return {
		localDocuments: sortedLocalDocuments,
		documentToDelete,
		isProcessing,
		isPending,
		isFailed,
		isCompleted,
		isDeleting,
		handleVectorize,
		confirmDelete,
		executeDelete,
		cancelDelete,
		openFile,
	};
}
