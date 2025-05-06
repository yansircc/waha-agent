import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogOutIcon, RefreshCwIcon, StopCircleIcon } from "lucide-react";
import { DeleteButton } from "./delete-button";

export function ConnectedActions({
	onStop,
	onLogout,
	onDelete,
	onRefresh,
}: {
	onStop?: () => void;
	onLogout?: () => void;
	onDelete?: () => void;
	onRefresh?: () => void;
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
								onClick={onStop}
							>
								<StopCircleIcon
									className="h-5 w-5 text-gray-500"
									aria-hidden="true"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>停止</p>
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
								onClick={onRefresh}
							>
								<RefreshCwIcon
									className="h-5 w-5 text-gray-500"
									aria-hidden="true"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>刷新</p>
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
								onClick={onLogout}
							>
								<LogOutIcon
									className="h-5 w-5 text-gray-500"
									aria-hidden="true"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>退出登录</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<DeleteButton onDelete={onDelete} />
		</>
	);
}
