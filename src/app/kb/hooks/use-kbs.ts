import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";

interface UseKbsProps {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export function useKbs({ onSuccess, onError }: UseKbsProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const utils = api.useUtils();

	// Get all knowledge bases
	const kbsQuery = api.kbs.getAll.useQuery();

	// Get knowledge base by ID
	const getKbById = (id: string) => {
		return api.kbs.getById.useQuery({ id });
	};

	// Create a new knowledge base
	const createKbMutation = api.kbs.create.useMutation({
		onSuccess: () => {
			utils.kbs.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const createKb = async (data: {
		name: string;
		description?: string;
		content: string;
		fileUrl?: string;
		fileType?: string;
		metadata?: Record<string, unknown>;
	}) => {
		setIsLoading(true);
		try {
			const result = await createKbMutation.mutateAsync({
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
	const updateKbMutation = api.kbs.update.useMutation({
		onSuccess: () => {
			utils.kbs.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const updateKb = async (data: {
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
			const result = await updateKbMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Delete a knowledge base
	const deleteKbMutation = api.kbs.delete.useMutation({
		onSuccess: () => {
			utils.kbs.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const deleteKb = async (id: string) => {
		setIsLoading(true);
		try {
			const result = await deleteKbMutation.mutateAsync({ id });
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	return {
		kbs: kbsQuery.data || [],
		isLoadingKbs: kbsQuery.isLoading,
		getKbById,
		createKb,
		updateKb,
		deleteKb,
		isLoading,
	};
}
