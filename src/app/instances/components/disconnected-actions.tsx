import { Button } from "@/components/ui/button";
import { PlayIcon, QrCodeIcon } from "lucide-react";
import { DeleteButton } from "./delete-button";

export function DisconnectedActions({
	onScanQR,
	onStart,
	onDelete,
}: {
	onScanQR?: () => void;
	onStart?: () => void;
	onDelete?: () => void;
}) {
	return (
		<>
			<div className="flex w-0 flex-1">
				<Button
					variant="ghost"
					className="-mr-px relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 font-semibold text-gray-900 text-sm"
					onClick={onScanQR}
				>
					<QrCodeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
					扫描二维码
				</Button>
			</div>
			<div className="-ml-px flex w-0 flex-1">
				<Button
					variant="ghost"
					className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 border border-transparent py-4 font-semibold text-gray-900 text-sm"
					onClick={onStart}
				>
					<PlayIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
					开始
				</Button>
			</div>
			<DeleteButton onDelete={onDelete} />
		</>
	);
}
