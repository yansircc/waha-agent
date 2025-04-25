import { Button } from "@/components/ui/button";
import { LogOutIcon, PowerIcon, RefreshCwIcon } from "lucide-react";
import { DeleteButton } from "./delete-button";

export function ConnectedActions({
	onStop,
	onLogout,
	onRefresh,
	onDelete,
}: {
	onStop?: () => void;
	onLogout?: () => void;
	onRefresh?: () => void;
	onDelete?: () => void;
}) {
	return (
		<>
			<div className="flex w-0 flex-1">
				<Button
					variant="ghost"
					className="-mr-px relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 font-semibold text-gray-900 text-sm"
					onClick={onStop}
				>
					<PowerIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
					停止
				</Button>
			</div>
			<div className="-ml-px flex w-0 flex-1">
				<Button
					variant="ghost"
					className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 border border-transparent py-4 font-semibold text-gray-900 text-sm"
					onClick={onLogout}
				>
					<LogOutIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
					登出
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
			<DeleteButton onDelete={onDelete} />
		</>
	);
}
