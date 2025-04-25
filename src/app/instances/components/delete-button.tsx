import { Button } from "@/components/ui/button";
import { TrashIcon } from "lucide-react";

interface DeleteButtonProps {
	onDelete?: () => void;
}

export function DeleteButton({ onDelete }: DeleteButtonProps) {
	return (
		<div className="-ml-px flex w-0 flex-1">
			<Button
				variant="ghost"
				className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 border border-transparent py-4 font-semibold text-red-600 text-sm hover:bg-red-50"
				onClick={onDelete}
			>
				<TrashIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
				删除
			</Button>
		</div>
	);
}
