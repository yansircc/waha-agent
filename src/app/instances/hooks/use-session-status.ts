"use client";

import type { InstanceStatus } from "@/types";
import { useCallback, useRef } from "react";
import { useInstances } from "./use-instances";
import { useWahaSessions } from "./use-waha-sessions";

interface UseSessionStatusOptions {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}

export function useSessionStatus({
	onSuccess,
	onError,
}: UseSessionStatusOptions = {}) {
	const { updateInstance } = useInstances();
	const { fetchSessionByName } = useWahaSessions();
	const statusChecksInProgress = useRef<Record<string, boolean>>({});

	/**
	 * Checks the current status of a WhatsApp session and updates the instance accordingly
	 * with debouncing to prevent excessive API calls
	 */
	const checkSessionStatus = useCallback(
		async (instanceId: string, sessionName: string) => {
			// Check if a status check is already in progress for this instance
			const checkKey = `${instanceId}:${sessionName}`;
			if (statusChecksInProgress.current[checkKey]) {
				console.log(`状态检查已在进行中 - ${sessionName}`);
				return null;
			}

			// Mark this check as in progress
			statusChecksInProgress.current[checkKey] = true;

			try {
				// Get session status directly
				const session = await fetchSessionByName(sessionName);

				if (session) {
					console.log(`检查会话状态 - ${sessionName}:`, session.status);

					// Map WAHA API status to our application status
					let instanceStatus: InstanceStatus = "connecting";

					// Update instance status based on session status
					if (session.status === "RUNNING" || session.status === "WORKING") {
						instanceStatus = "connected";
					} else if (
						session.status === "STOPPED" ||
						session.status === "ERROR"
					) {
						instanceStatus = "disconnected";
					} else if (session.status === "SCAN_QR_CODE") {
						// If QR code needed, set status to disconnected
						instanceStatus = "disconnected";
					}

					// Update instance status
					await updateInstance({
						id: instanceId,
						status: instanceStatus,
					});

					onSuccess?.();

					// Clear in-progress flag
					statusChecksInProgress.current[checkKey] = false;
					return instanceStatus;
				}

				console.log(`未找到会话数据 - ${sessionName}`);

				// Clear in-progress flag
				statusChecksInProgress.current[checkKey] = false;
				return null;
			} catch (error) {
				console.error("检查会话状态时出错:", error);
				onError?.(error as Error);

				// Clear in-progress flag even on error
				statusChecksInProgress.current[checkKey] = false;
				return null;
			}
		},
		[fetchSessionByName, updateInstance, onSuccess, onError],
	);

	return {
		checkSessionStatus,
	};
}
