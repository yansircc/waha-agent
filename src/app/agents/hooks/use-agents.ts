import type { AppRouter } from "@/server/api/root";
import type { Agent } from "@/types/agents";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";
import { catchError } from "react-catch-error";

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

	const createAgent = async (data: Agent) => {
		setIsLoading(true);

		const { error, data: result } = await catchError(
			async () =>
				createAgentMutation.mutateAsync({
					...data,
					kbIds: data.kbIds ?? undefined,
				}),
			{
				onFinally: () => setIsLoading(false),
			},
		);

		if (error) {
			throw error;
		}

		return result;
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

	const updateAgent = async (data: Agent) => {
		setIsLoading(true);

		const { error, data: result } = await catchError(
			async () =>
				updateAgentMutation.mutateAsync({
					...data,
					kbIds: data.kbIds ?? undefined,
				}),
			{
				onFinally: () => setIsLoading(false),
			},
		);

		if (error) {
			throw error;
		}

		return result;
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

		const { error, data: result } = await catchError(
			async () => deleteAgentMutation.mutateAsync({ id }),
			{
				onFinally: () => setIsLoading(false),
			},
		);

		if (error) {
			throw error;
		}

		return result;
	};

	return {
		agents: agentsQuery.data || [],
		isLoadingAgents: agentsQuery.isLoading,
		getAgentById,
		createAgent,
		updateAgent,
		deleteAgent,
		isLoading,
	};
}
