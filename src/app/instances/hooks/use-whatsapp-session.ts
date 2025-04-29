"use client";

import { env } from "@/env";
import { api } from "@/utils/api";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useInstances } from "./use-instances";

export function useWhatsAppSession() {
	const [isLoading, setIsLoading] = useState(false);
	const { updateInstance } = useInstances();

	// Create mutations
	const createSessionMutation = api.wahaSessions.create.useMutation();
	const startSessionMutation = api.wahaSessions.start.useMutation();
	const stopSessionMutation = api.wahaSessions.stop.useMutation();
	const logoutSessionMutation = api.wahaSessions.logout.useMutation();
	const restartSessionMutation = api.wahaSessions.restart.useMutation();

	// Session creation with appropriate webhook configuration
	const createSession = useCallback(
		async (instanceId: string) => {
			setIsLoading(true);
			try {
				// Create a webhook URL for the instance
				const webhookUrl = `${env.NEXT_PUBLIC_WEBHOOK_URL}/api/webhooks/whatsapp/${instanceId}`;

				// Create session with webhooks for events including QR code generation
				const result = await createSessionMutation.mutateAsync({
					instanceId,
					start: true,
					config: {
						debug: false,
						metadata: { instanceId },
						webhooks: [
							{
								url: webhookUrl,
								events: ["message.any", "session.status"],
								hmac: null,
								retries: null,
								customHeaders: null,
							},
						],
					},
				});

				// Update instance status to connecting
				await updateInstance({
					id: instanceId,
					status: "connecting",
				});

				setIsLoading(false);
				return result;
			} catch (error) {
				setIsLoading(false);
				throw error;
			}
		},
		[updateInstance, createSessionMutation],
	);

	// Start session
	const startSession = useCallback(
		async (instanceId: string) => {
			setIsLoading(true);
			try {
				// Update instance status to connecting
				await updateInstance({
					id: instanceId,
					status: "connecting",
				});

				const result = await startSessionMutation.mutateAsync({
					instanceId,
				});

				setIsLoading(false);
				return result;
			} catch (error) {
				setIsLoading(false);
				throw error;
			}
		},
		[updateInstance, startSessionMutation],
	);

	// Stop session
	const stopSession = useCallback(
		async (instanceId: string) => {
			setIsLoading(true);
			try {
				const result = await stopSessionMutation.mutateAsync({
					instanceId,
				});
				setIsLoading(false);
				return result;
			} catch (error) {
				setIsLoading(false);
				throw error;
			}
		},
		[stopSessionMutation],
	);

	// Logout session
	const logoutSession = useCallback(
		async (instanceId: string) => {
			setIsLoading(true);
			try {
				const result = await logoutSessionMutation.mutateAsync({
					instanceId,
				});
				setIsLoading(false);
				return result;
			} catch (error) {
				setIsLoading(false);
				throw error;
			}
		},
		[logoutSessionMutation],
	);

	// Restart session
	const restartSession = useCallback(
		async (instanceId: string) => {
			setIsLoading(true);
			try {
				// Update instance status to connecting
				await updateInstance({
					id: instanceId,
					status: "connecting",
				});

				const result = await restartSessionMutation.mutateAsync({
					instanceId,
				});

				setIsLoading(false);
				return result;
			} catch (error) {
				setIsLoading(false);
				throw error;
			}
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
		isLoading,
		createSession,
		startSession,
		stopSession,
		logoutSession,
		restartSession,
		displayQRDialog,
	};
}
