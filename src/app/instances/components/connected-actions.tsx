import { Button } from "@/components/ui/button";
import { LogOutIcon, PowerIcon, RefreshCwIcon } from "lucide-react";

export function ConnectedActions({
	onStop,
	onLogout,
	onRefresh,
}: {
	onStop?: () => void;
	onLogout?: () => void;
	onRefresh?: () => void;
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
					Stop
				</Button>
			</div>
			<div className="-ml-px flex w-0 flex-1">
				<Button
					variant="ghost"
					className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 border border-transparent py-4 font-semibold text-gray-900 text-sm"
					onClick={onLogout}
				>
					<LogOutIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
					Logout
				</Button>
			</div>
			<div className="-ml-px flex w-0 flex-1">
				<Button
					variant="ghost"
					className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 font-semibold text-gray-900 text-sm"
					onClick={onRefresh}
				>
					<RefreshCwIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
					Refresh
				</Button>
			</div>
		</>
	);
}
