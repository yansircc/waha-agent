import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrashIcon } from "lucide-react";

export function DeleteButton({ onDelete }: { onDelete?: () => void }) {
	return (
		<div className="-ml-px flex w-0 flex-1">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							className="relative inline-flex w-0 flex-1 cursor-pointer items-center justify-center rounded-br-lg border border-transparent py-4"
							onClick={onDelete}
						>
							<TrashIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>删除</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	);
}
