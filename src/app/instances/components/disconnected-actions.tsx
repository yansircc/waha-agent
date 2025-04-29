import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								className="relative inline-flex w-0 flex-1 cursor-pointer items-center justify-center rounded-bl-lg border border-transparent py-4"
								onClick={onScanQR}
							>
								<QrCodeIcon
									className="h-5 w-5 text-gray-500"
									aria-hidden="true"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>扫描二维码</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<div className="-ml-px flex w-0 flex-1">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								className="relative inline-flex w-0 flex-1 cursor-pointer items-center justify-center border border-transparent py-4"
								onClick={onStart}
							>
								<PlayIcon
									className="h-5 w-5 text-gray-500"
									aria-hidden="true"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>启动</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<DeleteButton onDelete={onDelete} />
		</>
	);
}
