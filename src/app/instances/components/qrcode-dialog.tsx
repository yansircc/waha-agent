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
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		setLocalQrCode(qrCode);
	}, [qrCode]);

	useEffect(() => {
		if (!open || !instanceId) return;

		const checkLatestQrCode = () => {
			const instance = instances.find((inst) => inst.id === instanceId);

			if (instance?.qrCode && instance.qrCode !== localQrCode) {
				console.log("QR码对话框: 发现新的QR码，更新显示");
				setLocalQrCode(instance.qrCode);
				setIsLoading(false);
			} else if (!instance?.qrCode && !isLoading) {
				setIsLoading(true);
			}
		};

		checkLatestQrCode();

		const intervalId = setInterval(checkLatestQrCode, 1000);

		return () => {
			clearInterval(intervalId);
		};
	}, [open, instanceId, instances, localQrCode, isLoading]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Scan QR Code</DialogTitle>
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
								Scan this QR code with your WhatsApp app to connect
							</p>
						</>
					) : (
						<div className="flex flex-col items-center justify-center p-8">
							<Loader2 className="mb-4 h-8 w-8 animate-spin text-gray-400" />
							<p className="text-gray-500 text-sm">Loading QR code...</p>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)}>Close</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
