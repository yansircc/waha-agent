"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { XIcon } from "lucide-react";

interface QRCodeDisplayProps {
	qrCode: string;
	onClose: () => void;
}

export function QRCodeDisplay({ qrCode, onClose }: QRCodeDisplayProps) {
	return (
		<Dialog open={true} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>扫描二维码</DialogTitle>
					<DialogDescription>
						请使用WhatsApp扫描此二维码来连接您的实例
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col items-center justify-center p-6">
					<div className="relative h-64 w-64">
						<img
							src={`data:image/png;base64,${qrCode}`}
							alt="WhatsApp QR Code"
							className="h-full w-full object-contain"
						/>
					</div>
					<p className="mt-4 text-center text-gray-500 text-sm">
						二维码有效期为60秒，请尽快扫描
					</p>
				</div>
				<div className="flex justify-end">
					<Button variant="outline" onClick={onClose}>
						<XIcon className="mr-2 h-4 w-4" />
						关闭
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
