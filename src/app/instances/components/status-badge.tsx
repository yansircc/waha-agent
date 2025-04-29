import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { InstanceStatus } from "@/types";

interface StatusBadgeProps {
	status: InstanceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
	const statusConfig = {
		connected: {
			color: "bg-green-500",
			tooltip: "已连接",
		},
		connecting: {
			color: "bg-yellow-500",
			tooltip: "连接中",
		},
		disconnected: {
			color: "bg-red-500",
			tooltip: "未连接",
		},
	};

	const config = statusConfig[status];

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
