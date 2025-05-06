"use client";

import { api } from "@/utils/api";
import { useCallback } from "react";
import { useInstances } from "./use-instances";

export function useWhatsAppSession() {
	const { updateInstance } = useInstances();

	// Get mutations with built-in loading states
	const createSessionMutation = api.wahaSessions.create.useMutation();
	const startSessionMutation = api.wahaSessions.start.useMutation();
	const stopSessionMutation = api.wahaSessions.stop.useMutation();
	const logoutSessionMutation = api.wahaSessions.logout.useMutation();
	const restartSessionMutation = api.wahaSessions.restart.useMutation();

	// Session creation (uses server-side webhook configuration)
	const createSession = useCallback(
		async (instanceId: string) => {
			// Create session using server-side config
			const result = await createSessionMutation.mutateAsync({
				instanceId,
				start: true,
				// No need to specify config here - server handles it
			});

			// Update instance status to connecting
			await updateInstance({
				id: instanceId,
				status: "connecting",
			});

			return result;
		},
		[updateInstance, createSessionMutation],
	);

	// Start session
	const startSession = useCallback(
		async (instanceId: string) => {
			// Update instance status to connecting
			await updateInstance({
				id: instanceId,
				status: "connecting",
			});

			return startSessionMutation.mutateAsync({
				instanceId,
			});
		},
		[updateInstance, startSessionMutation],
	);

	// Stop session
	const stopSession = useCallback(
		async (instanceId: string) => {
			return stopSessionMutation.mutateAsync({ instanceId });
		},
		[stopSessionMutation],
	);

	// Logout session
	const logoutSession = useCallback(
		async (instanceId: string) => {
			return logoutSessionMutation.mutateAsync({ instanceId });
		},
		[logoutSessionMutation],
	);

	// Restart session
	const restartSession = useCallback(
		async (instanceId: string) => {
			// Update instance status to connecting
			await updateInstance({
				id: instanceId,
				status: "connecting",
			});

			return restartSessionMutation.mutateAsync({
				instanceId,
			});
		},
		[updateInstance, restartSessionMutation],
	);

	// Display QR code dialog
	const displayQRDialog = useCallback((instanceId: string) => {
		const event = new CustomEvent("open-qr-dialog", {
			detail: { instanceId },
		});
		document.dispatchEvent(event);
	}, []);

	return {
		isLoading:
			createSessionMutation.isPending ||
			startSessionMutation.isPending ||
			stopSessionMutation.isPending ||
			logoutSessionMutation.isPending ||
			restartSessionMutation.isPending,
		createSession,
		startSession,
		stopSession,
		logoutSession,
		restartSession,
		displayQRDialog,
	};
}
