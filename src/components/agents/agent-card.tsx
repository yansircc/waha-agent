"use client";

import type { Agent } from "@/app/agents/page";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	EllipsisVerticalIcon,
	PencilIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { Button } from "../ui/button";

interface AgentCardProps {
	agent: Agent;
	onEdit: () => void;
	onDelete: () => void;
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
	return (
		<div className="overflow-hidden rounded-lg bg-white shadow">
			<div className="p-5">
				<div className="flex items-center justify-between">
					<h3 className="truncate font-medium text-gray-900 text-lg leading-6">
						{agent.name}
					</h3>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<EllipsisVerticalIcon
									className="h-5 w-5 text-gray-400"
									aria-hidden="true"
								/>
								<span className="sr-only">Open options</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={onEdit}>
								<PencilIcon className="mr-2 h-4 w-4" />
								<span>Edit</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={onDelete} className="text-red-600">
								<TrashIcon className="mr-2 h-4 w-4" />
								<span>Delete</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<p className="mt-1 text-gray-500 text-sm">
					Created {formatDistanceToNow(agent.createdAt, { addSuffix: true })}
				</p>
				<div className="mt-3">
					<p className="line-clamp-3 text-gray-700 text-sm">
						{agent.prompt.length > 150
							? `${agent.prompt.slice(0, 150)}...`
							: agent.prompt}
					</p>
				</div>
				{agent.knowledgeBaseIds && agent.knowledgeBaseIds.length > 0 && (
					<div className="mt-3">
						<h4 className="font-medium text-gray-500 text-xs">
							Knowledge Bases:
						</h4>
						<div className="mt-1 flex flex-wrap gap-1">
							{agent.knowledgeBaseIds.map((id) => (
								<span
									key={id}
									className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800 text-xs"
								>
									{id}
								</span>
							))}
						</div>
					</div>
				)}
			</div>
			<div className="border-gray-200 border-t bg-gray-50 px-5 py-3">
				<div className="flex items-center justify-between">
					<span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 font-medium text-green-700 text-xs ring-1 ring-green-600/20 ring-inset">
						Active
					</span>
					<Button
						onClick={onEdit}
						variant="outline"
						size="sm"
						className="px-2 py-1"
					>
						Configure
					</Button>
				</div>
			</div>
		</div>
	);
}
