import { Badge } from "@/components/ui/badge";
import type { InstanceStatus } from "@/types";

export function StatusBadge({ status }: { status: InstanceStatus }) {
	const statusColors = {
		connected: "bg-green-100 text-green-800 ring-green-600/20",
		disconnected: "bg-red-100 text-red-800 ring-red-600/20",
		connecting: "bg-yellow-100 text-yellow-800 ring-yellow-600/20",
	};

	return (
		<Badge
			className={
				statusColors[status] || "bg-gray-100 text-gray-800 ring-gray-600/20"
			}
		>
			{status}
		</Badge>
	);
}
