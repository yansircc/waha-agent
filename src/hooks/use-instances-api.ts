import { env } from "@/env";
import type { SessionConfigSchema } from "@/types/schemas";
import { sanitizeSessionName } from "@/utils/session-utils";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { useInstances } from "./use-instances";
import { useQRCode } from "./use-qr-code";
import { useSessionStatus } from "./use-session-status";
import { useWahaSessions } from "./use-waha-sessions";

interface UseInstancesApiProps {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}

export function useInstancesApi({
	onSuccess,
	onError,
}: UseInstancesApiProps = {}) {
	const [isLoading, setIsLoading] = useState(false);

	// Use existing hooks
	const { updateInstance } = useInstances();
	const {
		sessions,
		isLoadingSessions,
		createSession,
		startSession,
		stopSession,
		logoutSession,
		restartSession,
		fetchSessionByName,
	} = useWahaSessions();

	// Use our new hooks
	const { getInstanceQR, displayQRCode } = useQRCode({ onError });
	const { checkSessionStatus } = useSessionStatus({ onError });

	// Create a WhatsApp session for the instance
	const createInstanceSession = useCallback(
		async (instanceId: string, instanceName: string, userId?: string) => {
			setIsLoading(true);
			try {
				// Sanitize session name to ensure it's API-friendly
				const sanitizedName = sanitizeSessionName(instanceName);

				// 获取配置信息
				const config: z.infer<typeof SessionConfigSchema> = {
					debug: false,
					webhooks: [],
				};

				// 如果提供了用户ID，创建带webhooks的配置
				if (userId) {
					const webhookUrl = `${env.NEXT_PUBLIC_WEBHOOK_URL}/${userId}`;

					// 构建配置信息
					config.metadata = {
						"user.id": userId,
					};

					config.webhooks = [
						{
							url: webhookUrl,
							events: ["message", "session.status"],
							hmac: null,
							retries: null,
							customHeaders: null,
						},
					];
				}

				// Create a session using WAHA API
				const sessionData = await createSession({
					name: sanitizedName,
					start: true,
					config: Object.keys(config).length > 0 ? config : undefined,
				});

				// Update the instance with the session data
				await updateInstance({
					id: instanceId,
					status: "connecting",
					sessionData: sessionData as unknown as Record<string, unknown>,
				});

				// Immediately try to get the QR code
				try {
					await getInstanceQR(instanceId, sanitizedName);
					// Check session status without polling
					await checkSessionStatus(instanceId, sanitizedName);
				} catch (error) {
					// Continue even if QR fetch fails on first attempt
					console.warn("Initial QR code fetch failed", error);
				}

				onSuccess?.();
				toast.success(`WhatsApp session for ${instanceName} has been created`);

				return sessionData;
			} catch (error) {
				const err = error as Error;
				onError?.(err);
				toast.error(`Error creating session: ${err.message}`);
				throw error;
			} finally {
				setIsLoading(false);
			}
		},
		[
			createSession,
			updateInstance,
			onSuccess,
			onError,
			getInstanceQR,
			checkSessionStatus,
		],
	);

	// Start instance session
	const startInstanceSession = useCallback(
		async (instanceId: string, sessionName: string) => {
			setIsLoading(true);
			try {
				// First check session status
				const session = await fetchSessionByName(sessionName);

				// If session is already running, just update status to connected
				if (
					session &&
					(session.status === "RUNNING" || session.status === "WORKING")
				) {
					await updateInstance({
						id: instanceId,
						status: "connected",
					});

					onSuccess?.();
					toast.success(
						`WhatsApp session for ${sessionName} is already running`,
					);

					return session;
				}

				// If session needs QR code, update status to disconnected to avoid getting stuck in connecting state
				if (session && session.status === "SCAN_QR_CODE") {
					await updateInstance({
						id: instanceId,
						status: "disconnected",
					});

					// Trigger QR code display
					displayQRCode(instanceId);

					return session;
				}

				// Session doesn't exist or is stopped, try to start it
				// Update instance status
				await updateInstance({
					id: instanceId,
					status: "connecting",
				});

				// Start the session in WAHA
				const sessionData = await startSession(sessionName);

				// Check session status after starting
				if (
					sessionData.status === "RUNNING" ||
					sessionData.status === "WORKING"
				) {
					// Successfully connected
					await updateInstance({
						id: instanceId,
						sessionData: sessionData as unknown as Record<string, unknown>,
						status: "connected",
					});
				} else if (sessionData.status === "SCAN_QR_CODE") {
					// Needs QR code
					await updateInstance({
						id: instanceId,
						sessionData: sessionData as unknown as Record<string, unknown>,
						status: "disconnected",
					});

					// Trigger QR code display
					displayQRCode(instanceId);
				} else {
					// Other status (usually starting up)
					await updateInstance({
						id: instanceId,
						sessionData: sessionData as unknown as Record<string, unknown>,
						status: "connecting",
					});

					// Check status immediately without polling
					await checkSessionStatus(instanceId, sessionName);
				}

				onSuccess?.();
				toast.success(`WhatsApp session for ${sessionName} has been started`);

				return sessionData;
			} catch (error) {
				const err = error as Error;

				// Reset status to disconnected on error
				await updateInstance({
					id: instanceId,
					status: "disconnected",
				});

				onError?.(err);
				toast.error(`Error starting session: ${err.message}`);
				throw error;
			} finally {
				setIsLoading(false);
			}
		},
		[
			startSession,
			updateInstance,
			onSuccess,
			onError,
			fetchSessionByName,
			checkSessionStatus,
			displayQRCode,
		],
	);

	// Stop instance session
	const stopInstanceSession = useCallback(
		async (instanceId: string, sessionName: string) => {
			setIsLoading(true);
			try {
				// Stop the session in WAHA
				const sessionData = await stopSession(sessionName);

				// Update instance status
				await updateInstance({
					id: instanceId,
					status: "disconnected",
					sessionData: sessionData as unknown as Record<string, unknown>,
				});

				onSuccess?.();
				toast.success(`WhatsApp session for ${sessionName} has been stopped`);

				return sessionData;
			} catch (error) {
				const err = error as Error;
				onError?.(err);
				toast.error(`Error stopping session: ${err.message}`);
				throw error;
			} finally {
				setIsLoading(false);
			}
		},
		[stopSession, updateInstance, onSuccess, onError],
	);

	// Logout instance session
	const logoutInstanceSession = useCallback(
		async (instanceId: string, sessionName: string) => {
			setIsLoading(true);
			try {
				// Logout the session in WAHA
				const sessionData = await logoutSession(sessionName);

				// Update instance status and clear QR code
				await updateInstance({
					id: instanceId,
					status: "disconnected",
					qrCode: "",
					sessionData: sessionData as unknown as Record<string, unknown>,
				});

				onSuccess?.();
				toast.success(
					`WhatsApp session for ${sessionName} has been logged out`,
				);

				return sessionData;
			} catch (error) {
				const err = error as Error;
				onError?.(err);
				toast.error(`Error logging out: ${err.message}`);
				throw error;
			} finally {
				setIsLoading(false);
			}
		},
		[logoutSession, updateInstance, onSuccess, onError],
	);

	// Refresh or restart the instance session
	const refreshInstanceSession = useCallback(
		async (instanceId: string, sessionName: string) => {
			setIsLoading(true);
			try {
				// Update instance status
				await updateInstance({
					id: instanceId,
					status: "connecting",
				});

				// Restart the session in WAHA
				const sessionData = await restartSession(sessionName);

				// Update session data
				await updateInstance({
					id: instanceId,
					sessionData: sessionData as unknown as Record<string, unknown>,
					status: "connected",
				});

				onSuccess?.();
				toast.success(`WhatsApp session for ${sessionName} has been refreshed`);

				return sessionData;
			} catch (error) {
				const err = error as Error;

				// Reset status to disconnected on error
				await updateInstance({
					id: instanceId,
					status: "disconnected",
				});

				onError?.(err);
				toast.error(`Error refreshing session: ${err.message}`);
				throw error;
			} finally {
				setIsLoading(false);
			}
		},
		[restartSession, updateInstance, onSuccess, onError],
	);

	return {
		sessions,
		isLoadingSessions,
		isLoading,
		createInstanceSession,
		getInstanceQR,
		startInstanceSession,
		stopInstanceSession,
		logoutInstanceSession,
		refreshInstanceSession,
	};
}
