import type {
	SessionCreateRequest,
	SessionUpdateRequest,
} from "@/lib/waha-api";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useCallback, useState } from "react";

interface UseWahaSessionsProps {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export function useWahaSessions({
	onSuccess,
	onError,
}: UseWahaSessionsProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const utils = api.useUtils();

	// Get all sessions
	const sessionsQuery = api.wahaSessions.list.useQuery();

	// Get session by name - React query hook version (for components)
	const getSessionByName = (session = "default") => {
		return api.wahaSessions.get.useQuery({ session });
	};

	// Get session by name - Imperative version (for event handlers and callbacks)
	const fetchSessionByName = async (session = "default") => {
		setIsLoading(true);
		try {
			const result = await utils.wahaSessions.get.fetch({ session });
			setIsLoading(false);
			return result;
		} catch (error) {
			console.error("Error fetching session:", error);
			setIsLoading(false);
			return null;
		}
	};

	// Get authenticated account info
	const getMeInfo = (session = "default") => {
		return api.wahaSessions.getMe.useQuery({ session });
	};

	// Create a session
	const createSessionMutation = api.wahaSessions.create.useMutation({
		onSuccess: () => {
			utils.wahaSessions.list.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const createSession = async (data: SessionCreateRequest) => {
		setIsLoading(true);
		try {
			const result = await createSessionMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Update a session
	const updateSessionMutation = api.wahaSessions.update.useMutation({
		onSuccess: () => {
			utils.wahaSessions.list.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const updateSession = async (
		sessionName: string,
		data: SessionUpdateRequest,
	) => {
		setIsLoading(true);
		try {
			const result = await updateSessionMutation.mutateAsync({
				session: sessionName,
				data,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Delete a session
	const deleteSessionMutation = api.wahaSessions.delete.useMutation({
		onSuccess: () => {
			utils.wahaSessions.list.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const deleteSession = async (sessionName: string) => {
		setIsLoading(true);
		try {
			const result = await deleteSessionMutation.mutateAsync({
				session: sessionName,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Start a session
	const startSessionMutation = api.wahaSessions.start.useMutation({
		onSuccess: () => {
			utils.wahaSessions.list.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const startSession = async (sessionName: string) => {
		setIsLoading(true);
		try {
			const result = await startSessionMutation.mutateAsync({
				session: sessionName,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Stop a session
	const stopSessionMutation = api.wahaSessions.stop.useMutation({
		onSuccess: () => {
			utils.wahaSessions.list.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const stopSession = async (sessionName: string) => {
		setIsLoading(true);
		try {
			const result = await stopSessionMutation.mutateAsync({
				session: sessionName,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Logout from a session
	const logoutSessionMutation = api.wahaSessions.logout.useMutation({
		onSuccess: () => {
			utils.wahaSessions.list.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const logoutSession = async (sessionName: string) => {
		setIsLoading(true);
		try {
			const result = await logoutSessionMutation.mutateAsync({
				session: sessionName,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Restart a session
	const restartSessionMutation = api.wahaSessions.restart.useMutation({
		onSuccess: () => {
			utils.wahaSessions.list.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const restartSession = async (sessionName: string) => {
		setIsLoading(true);
		try {
			const result = await restartSessionMutation.mutateAsync({
				session: sessionName,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	return {
		sessions: sessionsQuery.data || [],
		isLoadingSessions: sessionsQuery.isLoading,
		getSessionByName,
		fetchSessionByName,
		getMeInfo,
		createSession,
		updateSession,
		deleteSession,
		startSession,
		stopSession,
		logoutSession,
		restartSession,
		isLoading,
	};
}
