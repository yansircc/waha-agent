import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";

interface UseKnowledgeBasesProps {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export function useKnowledgeBases({
	onSuccess,
	onError,
}: UseKnowledgeBasesProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const utils = api.useUtils();

	// Get all knowledge bases
	const knowledgeBasesQuery = api.knowledgeBases.getAll.useQuery();

	// Get knowledge base by ID
	const getKnowledgeBaseById = (id: string) => {
		return api.knowledgeBases.getById.useQuery({ id });
	};

	// Create a new knowledge base
	const createKnowledgeBaseMutation = api.knowledgeBases.create.useMutation({
		onSuccess: () => {
			utils.knowledgeBases.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const createKnowledgeBase = async (data: {
		name: string;
		description?: string;
		content: string;
		fileUrl?: string;
		fileType?: string;
		metadata?: Record<string, unknown>;
	}) => {
		setIsLoading(true);
		try {
			const result = await createKnowledgeBaseMutation.mutateAsync({
				name: data.name,
				description: data.description,
				// Other fields are now handled through documents
			});
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Update a knowledge base
	const updateKnowledgeBaseMutation = api.knowledgeBases.update.useMutation({
		onSuccess: () => {
			utils.knowledgeBases.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const updateKnowledgeBase = async (data: {
		id: string;
		name?: string;
		description?: string;
		content?: string;
		fileUrl?: string;
		fileType?: string;
		metadata?: Record<string, unknown>;
	}) => {
		setIsLoading(true);
		try {
			const result = await updateKnowledgeBaseMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Delete a knowledge base
	const deleteKnowledgeBaseMutation = api.knowledgeBases.delete.useMutation({
		onSuccess: () => {
			utils.knowledgeBases.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const deleteKnowledgeBase = async (id: string) => {
		setIsLoading(true);
		try {
			const result = await deleteKnowledgeBaseMutation.mutateAsync({ id });
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	return {
		knowledgeBases: knowledgeBasesQuery.data || [],
		isLoadingKnowledgeBases: knowledgeBasesQuery.isLoading,
		getKnowledgeBaseById,
		createKnowledgeBase,
		updateKnowledgeBase,
		deleteKnowledgeBase,
		isLoading,
	};
}
