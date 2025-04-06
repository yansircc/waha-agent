"use client";

import { AgentChatDialog } from "@/components/agent-chat-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useAgents } from "@/hooks/use-agents";
import { MessageCircle, MoveRight, PenIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface AgentCardProps {
	id: string;
	name: string;
	prompt: string;
	knowledgeBases?: {
		id: string;
		name: string;
	}[];
	isActive?: boolean;
	onEdit?: () => void;
}

export function AgentCard({
	id,
	name,
	prompt,
	knowledgeBases = [],
	isActive = false,
	onEdit,
}: AgentCardProps) {
	const [isChatOpen, setIsChatOpen] = useState(false);
	const { toggleAgentActiveStatus, isLoading } = useAgents();

	const handleToggleActive = async (checked: boolean) => {
		await toggleAgentActiveStatus(id);
	};

	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border bg-background p-6 shadow transition-all hover:shadow-md">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="font-semibold text-xl tracking-tight">{name}</h3>
				<div className="flex items-center gap-2">
					<Switch
						checked={isActive}
						onCheckedChange={handleToggleActive}
						disabled={isLoading}
						aria-label={isActive ? "Deactivate agent" : "Activate agent"}
					/>
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

			{knowledgeBases.length > 0 && (
				<div className="mb-6 flex flex-wrap gap-2">
					{knowledgeBases.map((kb) => (
						<Badge key={kb.id} variant="secondary">
							{kb.name}
						</Badge>
					))}
				</div>
			)}

			<div className="mt-auto flex items-center justify-between pt-4">
				<Button
					variant="outline"
					size="sm"
					className="gap-1"
					onClick={() => setIsChatOpen(true)}
					disabled={!isActive}
				>
					<MessageCircle className="h-4 w-4" /> Test Chat
				</Button>
				<Button
					variant="link"
					size="sm"
					asChild
					className="px-0 text-foreground/60 hover:text-foreground/80"
				>
					<Link href={`/agents/${id}`}>
						Details <MoveRight className="ml-1 h-4 w-4" />
					</Link>
				</Button>
			</div>

			{isChatOpen && (
				<AgentChatDialog
					agentId={id}
					agentName={name}
					open={isChatOpen}
					onOpenChange={setIsChatOpen}
				/>
			)}
		</div>
	);
}
