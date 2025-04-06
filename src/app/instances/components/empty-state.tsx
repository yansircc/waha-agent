import { Button } from "@/components/ui/button";
import { PhoneIcon, PlusIcon } from "lucide-react";

export function EmptyState({ onAddInstance }: { onAddInstance: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center rounded-lg border bg-background p-12 text-center">
			<PhoneIcon className="mb-4 h-12 w-12 text-muted-foreground" />
			<h2 className="mb-2 font-semibold text-xl">No WhatsApp instances</h2>
			<p className="mb-6 text-muted-foreground">
				Connect WhatsApp to your AI agents by creating a new instance.
			</p>
			<Button onClick={onAddInstance}>
				<PlusIcon className="mr-2 h-4 w-4" /> Add Instance
			</Button>
		</div>
	);
}
