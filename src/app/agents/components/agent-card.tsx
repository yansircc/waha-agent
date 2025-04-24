"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Agent } from "@/types/agents";
import { InfoIcon, MessageCircle, PenIcon } from "lucide-react";
import { useState } from "react";
import { AgentChatDialog } from "./agent-chat-dialog";

interface AgentCardProps {
	agent: Agent;
	name: string;
	prompt: string;
	model: string;
	kbs?: {
		id: string;
		name: string;
	}[];
	onEdit?: () => void;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

export function AgentCard({
	agent,
	name,
	prompt,
	model,
	kbs = [],
	onEdit,
	createdAt,
	updatedAt,
}: AgentCardProps) {
	const [isChatOpen, setIsChatOpen] = useState(false);

	// Extract knowledge base IDs for use with the chat dialog
	const kbIds = kbs.map((kb) => kb.id);

	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border bg-background p-6 shadow transition-all hover:shadow-md">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="font-semibold text-xl tracking-tight">{name}</h3>
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<PenIcon className="h-4 w-4" />
								<span className="sr-only">Open menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-[160px]">
							<DropdownMenuItem onClick={onEdit}>Edit agent</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<p className="mb-4 line-clamp-3 text-muted-foreground text-sm">
				{prompt}
			</p>

			{kbs.length > 0 && (
				<div className="mb-6 flex flex-wrap gap-2">
					{kbs.map((kb) => (
						<Badge key={kb.id} variant="secondary">
							{kb.name}
						</Badge>
					))}
				</div>
			)}

			<div className="mt-auto flex items-center gap-2 pt-4">
				<Button
					variant="outline"
					size="sm"
					className="gap-1"
					onClick={() => setIsChatOpen(true)}
				>
					<MessageCircle className="h-4 w-4" /> Chat
				</Button>

				<div className="flex flex-1 items-center justify-end gap-2">
					{(createdAt || updatedAt) && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<InfoIcon className="h-4 w-4" />
									<span className="sr-only">Agent details</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs p-4">
								<div className="space-y-2">
									{createdAt && (
										<div>
											<p className="font-semibold text-xs">Created:</p>
											<p className="text-muted-foreground text-xs">
												{new Date(createdAt).toLocaleString()}
											</p>
										</div>
									)}
									{updatedAt && (
										<div>
											<p className="font-semibold text-xs">Updated:</p>
											<p className="text-muted-foreground text-xs">
												{new Date(updatedAt).toLocaleString()}
											</p>
										</div>
									)}
									<div>
										<p className="font-semibold text-xs">Model:</p>
										<p className="text-muted-foreground text-xs">{model}</p>
									</div>
								</div>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>

			{isChatOpen && (
				<AgentChatDialog
					agent={agent}
					agentName={name}
					open={isChatOpen}
					onOpenChange={setIsChatOpen}
					kbIds={kbIds}
				/>
			)}
		</div>
	);
}
