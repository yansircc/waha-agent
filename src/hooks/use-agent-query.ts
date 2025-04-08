import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";

interface UseAgentQueryProps {
	onSuccess?: (data: {
		answer: string;
		sources: string[];
		agentId: string;
		agentName: string;
	}) => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export function useAgentQuery({ onSuccess, onError }: UseAgentQueryProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const [answer, setAnswer] = useState<string | null>(null);
	const [sources, setSources] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);

	const queryMutation = api.agents.queryWithAgent.useMutation({
		onSuccess: (data) => {
			setAnswer(data.answer);
			setSources(data.sources);
			setError(null);
			onSuccess?.(data);
		},
		onError: (err) => {
			setError(err.message);
			onError?.(err);
		},
	});

	const queryWithAgent = async (
		agentId: string,
		question: string,
		kbIds?: string[],
	) => {
		setIsLoading(true);
		setAnswer(null);
		setSources([]);
		setError(null);

		try {
			const result = await queryMutation.mutateAsync({
				agentId,
				question,
				kbIds,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			if (error instanceof Error) {
				setError(error.message);
			}
			throw error;
		}
	};

	return {
		queryWithAgent,
		answer,
		sources,
		isLoading,
		error,
	};
}
