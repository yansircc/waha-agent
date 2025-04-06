import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export function QRCodeDialog({
	open,
	onOpenChange,
	qrCode,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	qrCode?: string;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Scan QR Code</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col items-center justify-center p-4">
					{qrCode ? (
						<>
							<img
								src={`data:image/png;base64,${qrCode}`}
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
