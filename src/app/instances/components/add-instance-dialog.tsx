import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AddInstanceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (name: string, agentId: string) => Promise<void>;
	instanceName: string;
	setInstanceName: (name: string) => void;
	selectedAgentId: string;
	setSelectedAgentId: (id: string) => void;
	isLoading: boolean;
	agents: Array<{ id: string; name: string }>;
	isLoadingAgents: boolean;
}

export function AddInstanceDialog({
	open,
	onOpenChange,
	onSubmit,
	instanceName,
	setInstanceName,
	selectedAgentId,
	setSelectedAgentId,
	isLoading,
	agents,
	isLoadingAgents,
}: AddInstanceDialogProps) {
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSubmit(instanceName, selectedAgentId);
	};

	const handleInstanceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// 只保留小写字母、数字和连字符
		const lowercaseValue = e.target.value
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, "");
		setInstanceName(lowercaseValue);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Add WhatsApp Instance</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Instance Name</Label>
							<Input
								id="name"
								value={instanceName}
								onChange={handleInstanceNameChange}
								placeholder="my-whatsapp"
								required
							/>
							<p className="text-muted-foreground text-xs">
								Only lowercase letters, numbers, and hyphens are allowed.
							</p>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="agent">Agent (optional)</Label>
							<select
								id="agent"
								value={selectedAgentId}
								onChange={(e) => setSelectedAgentId(e.target.value)}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								<option value="">Select an agent</option>
								{!isLoadingAgents &&
									agents.map((agent) => (
										<option key={agent.id} value={agent.id}>
											{agent.name}
										</option>
									))}
							</select>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!instanceName || isLoading}>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
								</>
							) : (
								"Add Instance"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
