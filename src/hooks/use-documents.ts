import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";

interface UseDocumentsProps {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export function useDocuments({ onSuccess, onError }: UseDocumentsProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const utils = api.useUtils();

	// Get documents by knowledge base ID
	const getDocumentsByKnowledgeBaseId = (
		knowledgeBaseId: string | undefined,
	) => {
		return api.knowledgeBases.getDocuments.useQuery(
			{ knowledgeBaseId: knowledgeBaseId || "" },
			{ enabled: !!knowledgeBaseId },
		);
	};

	// Get document by ID
	const getDocumentById = (id: string) => {
		return api.knowledgeBases.getDocumentById.useQuery({ id });
	};

	// Create a new document
	const createDocumentMutation = api.knowledgeBases.createDocument.useMutation({
		onSuccess: (data) => {
			// Invalidate the specific documents query for this knowledge base
			if (data?.knowledgeBaseId) {
				utils.knowledgeBases.getDocuments.invalidate({
					knowledgeBaseId: data.knowledgeBaseId,
				});
			}
			utils.knowledgeBases.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const createDocument = async (data: {
		name: string;
		content: string;
		knowledgeBaseId: string;
		fileUrl?: string;
		fileType?: string;
		fileSize?: number;
		metadata?: Record<string, unknown>;
	}) => {
		setIsLoading(true);
		try {
			const result = await createDocumentMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Update a document
	const updateDocumentMutation = api.knowledgeBases.updateDocument.useMutation({
		onSuccess: (data) => {
			if (data?.knowledgeBaseId) {
				utils.knowledgeBases.getDocuments.invalidate({
					knowledgeBaseId: data.knowledgeBaseId,
				});
			}
			utils.knowledgeBases.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const updateDocument = async (data: {
		id: string;
		name?: string;
		content?: string;
		knowledgeBaseId: string;
		fileUrl?: string;
		fileType?: string;
		fileSize?: number;
		metadata?: Record<string, unknown>;
	}) => {
		setIsLoading(true);
		try {
			const result = await updateDocumentMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Delete a document
	const deleteDocumentMutation = api.knowledgeBases.deleteDocument.useMutation({
		onSuccess: (_data, variables, context) => {
			// When we delete a document, we have its ID but we don't know its KB ID
			// So we just invalidate all document queries
			utils.knowledgeBases.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const deleteDocument = async (id: string) => {
		setIsLoading(true);
		try {
			const result = await deleteDocumentMutation.mutateAsync({ id });
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	return {
		getDocumentsByKnowledgeBaseId,
		getDocumentById,
		createDocument,
		updateDocument,
		deleteDocument,
		isLoading,
	};
}
