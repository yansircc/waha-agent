import type { AppRouter } from "@/server/api/root";
import type { agents } from "@/server/db/schema";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";

interface UseAgentsProps {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export function useAgents({ onSuccess, onError }: UseAgentsProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const utils = api.useUtils();

	// Get all agents
	const agentsQuery = api.agents.getAll.useQuery();

	// Get agent by ID
	const getAgentById = (id: string) => {
		return api.agents.getById.useQuery({ id });
	};

	// Create a new agent
	const createAgentMutation = api.agents.create.useMutation({
		onSuccess: () => {
			utils.agents.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const createAgent = async (data: {
		name: string;
		prompt: string;
		kbIds?: string[];
		isActive?: boolean;
	}) => {
		setIsLoading(true);
		try {
			const result = await createAgentMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Update an agent
	const updateAgentMutation = api.agents.update.useMutation({
		onSuccess: () => {
			utils.agents.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const updateAgent = async (data: {
		id: string;
		name?: string;
		prompt?: string;
		kbIds?: string[];
		isActive?: boolean;
	}) => {
		setIsLoading(true);
		try {
			const result = await updateAgentMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Delete an agent
	const deleteAgentMutation = api.agents.delete.useMutation({
		onSuccess: () => {
			utils.agents.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const deleteAgent = async (id: string) => {
		setIsLoading(true);
		try {
			const result = await deleteAgentMutation.mutateAsync({ id });
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Toggle agent active status
	const toggleActiveStatusMutation = api.agents.toggleActive.useMutation({
		onSuccess: () => {
			utils.agents.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const toggleAgentActiveStatus = async (id: string) => {
		setIsLoading(true);
		try {
			const result = await toggleActiveStatusMutation.mutateAsync({ id });
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	return {
		agents: agentsQuery.data || [],
		isLoadingAgents: agentsQuery.isLoading,
		getAgentById,
		createAgent,
		updateAgent,
		deleteAgent,
		toggleAgentActiveStatus,
		isLoading,
	};
}
