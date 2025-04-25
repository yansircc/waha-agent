import { Button } from "@/components/ui/button";
import { Loader2, RefreshCwIcon } from "lucide-react";

export function ConnectingActions({ onRefresh }: { onRefresh?: () => void }) {
	return (
		<div className="flex w-full flex-1">
			<div className="flex w-0 flex-1">
				<Button
					variant="ghost"
					className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 font-semibold text-gray-900 text-sm"
					disabled
				>
					<Loader2
						className="h-5 w-5 animate-spin text-gray-400"
						aria-hidden="true"
					/>
					连接中...
				</Button>
			</div>
			<div className="-ml-px flex w-0 flex-1">
				<Button
					variant="ghost"
					className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 font-semibold text-gray-900 text-sm"
					onClick={onRefresh}
				>
					<RefreshCwIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
					刷新
				</Button>
			</div>
		</div>
	);
}
