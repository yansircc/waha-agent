"use client";

import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon, X } from "lucide-react";
import { useState } from "react";

interface KnowledgeBase {
	id: string;
	name: string;
}

interface AgentConfigDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: {
		id?: string;
		name: string;
		prompt: string;
		knowledgeBaseIds: string[];
	}) => void;
	knowledgeBases?: KnowledgeBase[];
	defaultValues?: {
		id: string;
		name: string;
		prompt: string;
		knowledgeBaseIds: string[];
	};
	mode?: "create" | "edit";
}

export function AgentConfigDialog({
	open,
	onOpenChange,
	onSubmit,
	knowledgeBases = [],
	defaultValues,
	mode = "create",
}: AgentConfigDialogProps) {
	const [name, setName] = useState(defaultValues?.name || "");
	const [prompt, setPrompt] = useState(defaultValues?.prompt || "");
	const [selectedKnowledgeBaseIds, setSelectedKnowledgeBaseIds] = useState<
		string[]
	>(defaultValues?.knowledgeBaseIds || []);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			await onSubmit({
				id: defaultValues?.id,
				name,
				prompt,
				knowledgeBaseIds: selectedKnowledgeBaseIds,
			});
		} finally {
			setIsLoading(false);
		}
	};

	const toggleKnowledgeBase = (kbId: string) => {
		setSelectedKnowledgeBaseIds((prev) =>
			prev.includes(kbId) ? prev.filter((id) => id !== kbId) : [...prev, kbId],
		);
	};

	const modeTitle = mode === "create" ? "Create new agent" : "Edit agent";
	const actionLabel = mode === "create" ? "Create" : "Update";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>{modeTitle}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-6 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Customer Service Bot"
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="prompt">System Prompt</Label>
							<Textarea
								id="prompt"
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								placeholder="You are a helpful customer service agent..."
								className="min-h-[120px]"
								required
							/>
						</div>

						{knowledgeBases.length > 0 && (
							<div className="grid gap-2">
								<Label>Knowledge Bases</Label>
								<div className="flex flex-wrap gap-2">
									{knowledgeBases.map((kb) => (
										<Badge
											key={kb.id}
											variant={
												selectedKnowledgeBaseIds.includes(kb.id)
													? "default"
													: "outline"
											}
											className="cursor-pointer"
											onClick={() => toggleKnowledgeBase(kb.id)}
										>
											{kb.name}
											{selectedKnowledgeBaseIds.includes(kb.id) && (
												<CheckIcon className="ml-1 h-3 w-3" />
											)}
										</Badge>
									))}
								</div>
								<p className="text-muted-foreground text-xs">
									Select knowledge bases to connect to this agent
								</p>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!name || !prompt || isLoading}>
							{isLoading ? "Saving..." : actionLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
