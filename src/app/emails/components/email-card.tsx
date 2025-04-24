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
import { InfoIcon, MailIcon, PenIcon } from "lucide-react";
import { useEmails } from "../hooks/use-emails";

interface EmailCardProps {
	id: string;
	plunkApiKey: string;
	wechatPushApiKey: string;
	formDataFormId: string;
	formDataWebhookSecret: string;
	agentId: string;
	agent?: {
		id: string;
		name: string;
	};
	onEdit?: () => void;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

export function EmailCard({
	id,
	plunkApiKey,
	wechatPushApiKey,
	formDataFormId,
	formDataWebhookSecret,
	agentId,
	agent,
	onEdit,
	createdAt,
	updatedAt,
}: EmailCardProps) {
	const { isLoading } = useEmails();

	// Truncate API keys for display
	const truncatedPlunkKey = plunkApiKey ? `${plunkApiKey.slice(0, 8)}...` : "";
	const truncatedWebhookSecret = formDataWebhookSecret
		? `${formDataWebhookSecret.slice(0, 8)}...`
		: "";

	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border bg-background p-6 shadow transition-all hover:shadow-md">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="font-semibold text-xl tracking-tight">
					{formDataFormId}
				</h3>
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<PenIcon className="h-4 w-4" />
								<span className="sr-only">Open menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-[160px]">
							<DropdownMenuItem onClick={onEdit}>
								Edit email config
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{agent && (
				<div className="mb-6 flex">
					<Badge variant="secondary">Agent: {agent.name}</Badge>
				</div>
			)}

			<div className="mt-auto flex items-center gap-2 pt-4">
				<Button variant="outline" size="sm" className="gap-1" onClick={onEdit}>
					<MailIcon className="h-4 w-4" /> Configure
				</Button>

				<div className="flex flex-1 items-center justify-end gap-2">
					{(createdAt || updatedAt) && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<InfoIcon className="h-4 w-4" />
									<span className="sr-only">Email details</span>
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
								</div>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>
		</div>
	);
}
