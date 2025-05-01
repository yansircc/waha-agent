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
	status?: DocumentVectorizationStatus;
	isProcessing?: boolean;
	isCrawling?: boolean;
}

export function DocumentStatusBadge({
	status,
	isProcessing = false,
	isCrawling = false,
}: DocumentStatusBadgeProps) {
	const getStatusConfig = () => {
		if (isCrawling) {
			return {
				color: "bg-blue-500 animate-pulse",
				tooltip: "Crawling in progress...",
				icon: "...",
			};
		}

		if (isProcessing || status === "processing") {
			return {
				color: "bg-yellow-500 animate-pulse",
				tooltip: "Processing for vectorization...",
				icon: "⏳",
			};
		}

		if (status === "completed") {
			return {
				color: "bg-green-500",
				tooltip: "Vectorized",
				icon: "✅",
			};
		}

		if (status === "failed") {
			return {
				color: "bg-red-500",
				tooltip: "Vectorization Failed",
				icon: "❌",
			};
		}

		return {
			color: "bg-gray-400",
			tooltip: "Pending vectorization",
			icon: "📄",
		};
	};

	const config = getStatusConfig();

	return (
		<TooltipProvider delayDuration={100}>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex cursor-default items-center justify-center">
						<span
							className={cn("inline-block h-3 w-3 rounded-full", config.color)}
							aria-label={config.tooltip}
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
