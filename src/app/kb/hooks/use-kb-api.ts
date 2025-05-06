"use client";

import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";
import { useKbStore } from "./store";

interface UseKbApiOptions {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

/**
 * Hook for knowledge base CRUD operations
 */
export function useKbApi(options: UseKbApiOptions = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const utils = api.useUtils();
	const setSelectedKb = useKbStore((state) => state.setSelectedKb);
	const setActiveTab = useKbStore((state) => state.setActiveTab);

	// Get all knowledge bases
	const kbsQuery = api.kbs.getAll.useQuery();

	// Get knowledge base by ID
	const getKbById = (id: string) => {
		return api.kbs.getById.useQuery({ id });
	};

	// Create a new knowledge base
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
			const result = await utils.client.kbs.create.mutate({
				name: data.name,
				description: data.description,
			});

			await utils.kbs.getAll.invalidate();
			options.onSuccess?.();
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			const typedError = error as TRPCClientErrorLike<AppRouter>;
			options.onError?.(typedError);
			throw error;
		}
	};

	// Update a knowledge base
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
			const result = await utils.client.kbs.update.mutate(data);

			await utils.kbs.getAll.invalidate();
			options.onSuccess?.();
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			const typedError = error as TRPCClientErrorLike<AppRouter>;
			options.onError?.(typedError);
			throw error;
		}
	};

	// Delete a knowledge base
	const deleteKb = async (id: string) => {
		setIsLoading(true);
		try {
			const result = await utils.client.kbs.delete.mutate({ id });

			// Update local state if the deleted KB was selected
			const selectedKb = useKbStore.getState().selectedKb;
			if (selectedKb?.id === id) {
				setSelectedKb(null);
				setActiveTab("list");
			}

			await utils.kbs.getAll.invalidate();
			options.onSuccess?.();
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			const typedError = error as TRPCClientErrorLike<AppRouter>;
			options.onError?.(typedError);
			throw error;
		}
	};

	return {
		kbs: kbsQuery.data || [],
		isLoadingKbs: kbsQuery.isLoading || isLoading,
		getKbById,
		createKb,
		updateKb,
		deleteKb,
	};
}
