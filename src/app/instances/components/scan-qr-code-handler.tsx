"use client";

import { api } from "@/utils/api";
import { useState } from "react";
import { toast } from "sonner";
import { useInstances } from "../hooks/use-instances";
import { ConnectingActions } from "./connecting-actions";
import { QRCodeDisplay } from "./qr-code-display";

interface ScanQRCodeHandlerProps {
	instanceId: string;
	onDelete?: () => void;
}

export function ScanQRCodeHandler({
	instanceId,
	onDelete,
}: ScanQRCodeHandlerProps) {
	const [isChecking, setIsChecking] = useState(false);
	const [qrCode, setQrCode] = useState<string | null>(null);
	const [showQRCode, setShowQRCode] = useState(false);

	// Get API procedures and utils for invalidation
	const utils = api.useUtils();
	const { checkForQRCode } = useInstances();

	// Handle scan QR code button click
	const handleScanQR = async () => {
		if (isChecking) {
			return;
		}

		setIsChecking(true);

		try {
			// Check if QR code is available
			const result = await checkForQRCode(instanceId);

			// Always invalidate to get fresh data
			utils.instances.getAll.invalidate();

			if (result.hasQRCode && result.qrCode) {
				// QR code is available, show it
				setQrCode(result.qrCode);
				setShowQRCode(true);
			} else {
				// No QR code available
				toast.info("请稍等", {
					description: "目前没有可用的二维码，请稍后再试",
					action: {
						label: "再次检查",
						onClick: () => {
							// Add a slight delay before retrying
							setTimeout(() => {
								void handleScanQR();
							}, 500);
						},
					},
					duration: 5000,
				});
			}
		} catch (error) {
			toast.error("获取二维码失败", {
				description: "无法获取二维码，请稍后再试",
				action: {
					label: "重试",
					onClick: () => {
						// Add a slight delay before retrying
						setTimeout(() => {
							void handleScanQR();
						}, 500);
					},
				},
				duration: 5000,
			});
		} finally {
			setIsChecking(false);
		}
	};

	const handleCloseQRCode = () => {
		setShowQRCode(false);
	};

	return (
		<>
			<ConnectingActions onScanQR={handleScanQR} onDelete={onDelete} />

			{showQRCode && qrCode && (
				<QRCodeDisplay qrCode={qrCode} onClose={handleCloseQRCode} />
			)}
		</>
	);
}
