import type { InstanceStatus } from "@/types";
import { PhoneIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConnectedActions } from "./connected-actions";
import { DisconnectedActions } from "./disconnected-actions";
import { QRCodeDialog } from "./qrcode-dialog";
import { ScanQRCodeHandler } from "./scan-qr-code-handler";
import { StatusBadge } from "./status-badge";

interface InstanceCardProps {
	id: string;
	name: string;
	phoneNumber?: string;
	agentName?: string;
	status: InstanceStatus;
	qrCode?: string;
	onDelete?: () => void;
	onScanQR?: () => void;
	onStart?: () => void;
	onStop?: () => void;
	onLogout?: () => void;
}

export function InstanceCard({
	id,
	name,
	phoneNumber,
	agentName,
	status,
	qrCode,
	onDelete,
	onScanQR,
	onStart,
	onStop,
	onLogout,
}: InstanceCardProps) {
	const [showQR, setShowQR] = useState(false);
	const hasRequestedQR = useRef(false);

	// Listen for open QR dialog events
	useEffect(() => {
		const handleOpenQrDialog = (e: CustomEvent<{ instanceId: string }>) => {
			if (e.detail.instanceId === id) {
				setShowQR(true);
			}
		};

		document.addEventListener(
			"open-qr-dialog",
			handleOpenQrDialog as EventListener,
		);
		return () => {
			document.removeEventListener(
				"open-qr-dialog",
				handleOpenQrDialog as EventListener,
			);
		};
	}, [id]);

	// Auto-show QR code if it becomes available and we're already showing the dialog
	useEffect(() => {
		if (
			showQR &&
			!qrCode &&
			(status === "disconnected" || status === "connecting") &&
			!hasRequestedQR.current
		) {
			// Set flag to prevent multiple calls
			hasRequestedQR.current = true;

			// Request QR code
			onScanQR?.();
		}

		// Reset flag when QR code is received or dialog is closed
		if ((!showQR || qrCode) && hasRequestedQR.current) {
			hasRequestedQR.current = false;
		}
	}, [showQR, qrCode, status, onScanQR]);

	// Handle QR scan request
	const handleScanQR = () => {
		if (onScanQR) {
			onScanQR();
			setShowQR(true);
		}
	};

	return (
		<div
			className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow"
			id={`instance-card-${id}`}
		>
			<div className="flex flex-col p-6">
				<div className="flex items-center justify-between">
					<h3 className="truncate font-medium text-gray-900 text-lg">{name}</h3>
					<StatusBadge status={status} />
				</div>
				<div className="mt-2 flex items-center text-gray-500 text-sm">
					<PhoneIcon
						className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
						aria-hidden="true"
					/>
					{phoneNumber || "没有手机号码"}
				</div>
				<div className="mt-4 space-y-3">
					<div>
						<h4 className="font-medium text-gray-500 text-sm">
							连接的AI机器人
						</h4>
						<p className="mt-1 font-medium text-gray-900 text-sm">
							{agentName || "没有AI机器人"}
						</p>
					</div>
				</div>
			</div>
			<div>
				<div className="-mt-px flex divide-x divide-gray-200">
					{status === "disconnected" ? (
						<DisconnectedActions
							onScanQR={handleScanQR}
							onStart={onStart}
							onDelete={onDelete}
						/>
					) : status === "connected" ? (
						<ConnectedActions
							onStop={onStop}
							onLogout={onLogout}
							onDelete={onDelete}
						/>
					) : (
						<ScanQRCodeHandler instanceId={id} onDelete={onDelete} />
					)}
				</div>
			</div>

			{/* Only show QR dialog for disconnected status - connecting status now uses ScanQRCodeHandler */}
			{status !== "connecting" && (
				<QRCodeDialog
					open={showQR}
					onOpenChange={setShowQR}
					qrCode={qrCode}
					instanceId={id}
				/>
			)}
		</div>
	);
}
