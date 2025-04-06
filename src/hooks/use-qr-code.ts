"use client";

import { useCallback, useRef } from "react";
import { useInstances } from "./use-instances";
import { useWahaAuth } from "./use-waha-auth";

interface UseQRCodeOptions {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}

export function useQRCode({ onSuccess, onError }: UseQRCodeOptions = {}) {
	const { updateInstance } = useInstances();
	const { fetchQRCode } = useWahaAuth();
	const qrRequestsInProgress = useRef<Record<string, boolean>>({});

	// Get QR code for the instance with debouncing
	const getInstanceQR = useCallback(
		async (instanceId: string, sessionName: string) => {
			// Check if a QR request is already in progress for this instance
			const requestKey = `${instanceId}:${sessionName}`;
			if (qrRequestsInProgress.current[requestKey]) {
				console.log(`QR code request already in progress for ${sessionName}`);
				return null;
			}

			// Mark this request as in progress
			qrRequestsInProgress.current[requestKey] = true;

			try {
				const qrData = await fetchQRCode(sessionName, "image");

				// Handle the case where fetchQRCode returns null
				if (!qrData) {
					console.log("QR code fetch returned null for session:", sessionName);
					qrRequestsInProgress.current[requestKey] = false;
					return null;
				}

				if (qrData && typeof qrData === "object" && "data" in qrData) {
					// Update the instance with the QR code
					await updateInstance({
						id: instanceId,
						qrCode: qrData.data,
					});

					onSuccess?.();
					qrRequestsInProgress.current[requestKey] = false;
					return qrData.data;
				}

				// If we get here, the QR code isn't available yet
				console.log("QR code not yet available for session:", sessionName);
				qrRequestsInProgress.current[requestKey] = false;
				return null;
			} catch (error) {
				const err = error as Error;
				console.error(`Error getting QR code: ${err.message}`);
				onError?.(err);
				qrRequestsInProgress.current[requestKey] = false;
				return null;
			}
		},
		[fetchQRCode, updateInstance, onSuccess, onError],
	);

	// Function to display QR code in UI
	const displayQRCode = useCallback((instanceId: string) => {
		const event = new CustomEvent("open-qr-dialog", {
			detail: { instanceId },
		});
		document.dispatchEvent(event);
	}, []);

	return {
		getInstanceQR,
		displayQRCode,
	};
}
