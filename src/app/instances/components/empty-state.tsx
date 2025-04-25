import { Button } from "@/components/ui/button";
import { PhoneIcon, PlusIcon } from "lucide-react";

export function EmptyState({ onAddInstance }: { onAddInstance: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center rounded-lg border bg-background p-12 text-center">
			<PhoneIcon className="mb-4 h-12 w-12 text-muted-foreground" />
			<h2 className="mb-2 font-semibold text-xl">还没有WhatsApp账号</h2>
			<p className="mb-6 text-muted-foreground">
				通过创建一个新的账号来连接WhatsApp到你的AI机器人。
			</p>
			<Button onClick={onAddInstance}>
				<PlusIcon className="mr-2 h-4 w-4" /> 添加账号
			</Button>
		</div>
	);
}
