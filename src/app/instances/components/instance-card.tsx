import { env } from "@/env";
import type { InstanceStatus } from "@/types";
import {
	EyeIcon,
	EyeOffIcon,
	InfoIcon,
	PhoneIcon,
	ServerIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConnectedActions } from "./connected-actions";
import { DisconnectedActions } from "./disconnected-actions";
import { QRCodeDialog } from "./qrcode-dialog";
import { QueueStatusIndicator } from "./queue-status-indicator";
import { ScanQRCodeHandler } from "./scan-qr-code-handler";
import { StatusBadge } from "./status-badge";

interface InstanceCardProps {
	id: string;
	name: string;
	phoneNumber?: string;
	agentName?: string;
	userWahaApiEndpoint?: string;
	userWahaApiKey?: string;
	status: InstanceStatus;
	qrCode?: string;
	queueJobId?: string; // 队列任务ID
	onDelete?: () => void;
	onScanQR?: () => void;
	onStart?: () => void;
	onStop?: () => void;
	onLogout?: () => void;
	onRefresh?: () => void;
}

export function InstanceCard({
	id,
	name,
	phoneNumber,
	agentName,
	status,
	userWahaApiEndpoint,
	userWahaApiKey,
	qrCode,
	queueJobId,
	onDelete,
	onScanQR,
	onStart,
	onStop,
	onLogout,
	onRefresh,
}: InstanceCardProps) {
	const [showQR, setShowQR] = useState(false);
	const [showDetails, setShowDetails] = useState(false);
	const [showApiKey, setShowApiKey] = useState(false);
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

	// 切换详细信息显示
	const toggleDetails = () => {
		setShowDetails(!showDetails);
	};

	// 切换API Key显示
	const toggleApiKeyVisibility = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowApiKey(!showApiKey);
	};

	// 将API Key显示为星号
	const maskApiKey = (key?: string) => {
		if (!key) return "********";
		return "*".repeat(Math.min(12, key.length));
	};

	return (
		<div
			className="col-span-1 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md"
			id={`instance-card-${id}`}
		>
			<div className="flex flex-col p-5">
				<div className="flex items-center justify-between">
					<h3 className="truncate font-semibold text-gray-900 text-lg">
						{name}
					</h3>
					<div className="flex items-center gap-2">
						{status === "connecting" && (
							<QueueStatusIndicator instanceId={id} jobId={queueJobId} />
						)}
						<StatusBadge status={status} />
					</div>
				</div>

				<div className="mt-2 flex items-center space-x-1 text-gray-600 text-sm">
					<PhoneIcon className="h-4 w-4" />
					<span className="truncate">{phoneNumber || "没有手机号码"}</span>
				</div>

				<div className="mt-2 flex items-center space-x-1 text-gray-600 text-sm">
					<ServerIcon className="h-4 w-4" />
					<span className="truncate">{agentName || "没有AI机器人"}</span>
				</div>

				{/* 详细信息按钮 */}
				<button
					onClick={toggleDetails}
					className="mt-3 flex items-center text-gray-500 text-xs hover:text-gray-700"
					type="button"
				>
					<InfoIcon className="mr-1 h-3.5 w-3.5" />
					{showDetails ? "隐藏详情" : "查看详情"}
				</button>

				{/* 详细信息面板 */}
				{showDetails && (
					<div className="mt-2 rounded-md bg-gray-50 p-3 text-xs">
						<div className="mb-1 flex">
							<span className="w-20 font-medium text-gray-500">API端点:</span>
							<span className="truncate text-gray-700">
								{userWahaApiEndpoint || env.NEXT_PUBLIC_WAHA_API_URL}
							</span>
						</div>

						{/* 只有在提供了API端点时才显示API Key */}
						{userWahaApiEndpoint && (
							<div className="mb-1 flex items-center">
								<span className="w-20 font-medium text-gray-500">API Key:</span>
								<span className="truncate text-gray-700">
									{showApiKey
										? userWahaApiKey || "当前 API_KEY 仅管理员可见"
										: maskApiKey(userWahaApiKey)}
								</span>
								<button
									onClick={toggleApiKeyVisibility}
									className="ml-1 text-gray-500 hover:text-gray-700"
									type="button"
									aria-label={showApiKey ? "隐藏API Key" : "显示API Key"}
								>
									{showApiKey ? (
										<EyeOffIcon className="h-3.5 w-3.5" />
									) : (
										<EyeIcon className="h-3.5 w-3.5" />
									)}
								</button>
							</div>
						)}

						<div className="flex">
							<span className="w-20 font-medium text-gray-500">实例ID:</span>
							<span className="truncate text-gray-700">{id}</span>
						</div>
					</div>
				)}
			</div>

			<div className="px-1 pb-1">
				<div className="flex divide-x divide-gray-100 rounded-lg bg-gray-50">
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
							onRefresh={onRefresh}
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
