"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Agent } from "@/types/agents";
import { MessageCircle, PenIcon, TrashIcon } from "lucide-react";
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
	onDelete?: () => void;
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
	onDelete,
	createdAt,
	updatedAt,
}: AgentCardProps) {
	const [isChatOpen, setIsChatOpen] = useState(false);

	// Extract knowledge base IDs for use with the chat dialog
	const kbIds = kbs.map((kb) => kb.id);

	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border bg-background shadow transition-all hover:shadow-md">
			<div className="flex flex-col gap-4 p-6">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold text-xl tracking-tight">{name}</h3>
				</div>

				<p className="line-clamp-3 text-muted-foreground text-sm">{prompt}</p>

				{kbs.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{kbs.map((kb) => (
							<Badge key={kb.id} variant="secondary">
								{kb.name}
							</Badge>
						))}
					</div>
				)}
			</div>

			<div className="mt-auto border-t">
				<div className="-mt-px flex divide-x divide-gray-200">
					<div className="flex w-0 flex-1">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										className="relative inline-flex w-0 flex-1 cursor-pointer items-center justify-center rounded-bl-lg border border-transparent py-4"
										onClick={() => setIsChatOpen(true)}
									>
										<MessageCircle
											className="h-5 w-5 text-gray-500"
											aria-hidden="true"
										/>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>聊天测试</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<div className="-ml-px flex w-0 flex-1">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										className="relative inline-flex w-0 flex-1 cursor-pointer items-center justify-center border border-transparent py-4"
										onClick={onEdit}
									>
										<PenIcon
											className="h-5 w-5 text-gray-500"
											aria-hidden="true"
										/>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>编辑</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<div className="-ml-px flex w-0 flex-1">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										className="relative inline-flex w-0 flex-1 cursor-pointer items-center justify-center rounded-br-lg border border-transparent py-4"
										onClick={onDelete}
									>
										<TrashIcon
											className="h-5 w-5 text-red-400"
											aria-hidden="true"
										/>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>删除</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
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
