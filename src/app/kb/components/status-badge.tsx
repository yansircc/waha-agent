import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/document";

// For document vectorization status
type DocumentVectorizationStatus = Document["vectorizationStatus"];

interface DocumentStatusBadgeProps {
	status: DocumentVectorizationStatus | undefined;
	isProcessing?: boolean;
}

export function DocumentStatusBadge({
	status,
	isProcessing = false,
}: DocumentStatusBadgeProps) {
	const getStatusConfig = () => {
		if (isProcessing || status === "processing") {
			return {
				color: "bg-yellow-500",
				tooltip: "处理中",
			};
		}

		if (status === "completed") {
			return {
				color: "bg-green-500",
				tooltip: "已投喂",
			};
		}

		if (status === "failed") {
			return {
				color: "bg-red-500",
				tooltip: "投喂失败",
			};
		}

		return {
			color: "bg-yellow-500",
			tooltip: "待投喂",
		};
	};

	const config = getStatusConfig();

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<div className="flex items-center">
						<span
							className={cn(
								"inline-block h-3 w-3 animate-pulse rounded-full",
								config.color,
							)}
						/>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>{config.tooltip}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
