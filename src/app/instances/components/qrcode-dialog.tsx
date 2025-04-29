import { useInstances } from "@/app/instances/hooks/use-instances";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function QRCodeDialog({
	open,
	onOpenChange,
	qrCode,
	instanceId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	qrCode?: string;
	instanceId: string;
}) {
	const [localQrCode, setLocalQrCode] = useState<string | undefined>(qrCode);
	const { instances } = useInstances();

	// Update local QR code when prop changes or when instance QR code is updated
	useEffect(() => {
		// If dialog is not open, don't update
		if (!open) return;

		// If prop QR code is provided, use it
		if (qrCode) {
			setLocalQrCode(qrCode);
			return;
		}

		// Otherwise, find QR code from instances
		const instance = instances.find((inst) => inst.id === instanceId);
		if (instance?.qrCode && instance.qrCode !== localQrCode) {
			setLocalQrCode(instance.qrCode);
		}
	}, [open, qrCode, instanceId, instances, localQrCode]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>扫描二维码</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col items-center justify-center p-4">
					{localQrCode ? (
						<>
							<img
								src={`data:image/png;base64,${localQrCode}`}
								alt="WhatsApp QR Code"
								className="h-64 w-64"
							/>
							<p className="mt-4 text-gray-500 text-sm">
								使用你的WhatsApp应用扫描这个二维码来连接
							</p>
						</>
					) : (
						<div className="flex flex-col items-center justify-center p-8">
							<Loader2 className="mb-4 h-8 w-8 animate-spin text-gray-400" />
							<p className="text-gray-500 text-sm">等待二维码生成...</p>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)}>关闭</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
