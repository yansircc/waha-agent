"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { env } from "@/env";
import { MailIcon, PenIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { EmailTestDialog } from "./email-test-dialog";

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
	onDelete?: () => void;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

export function EmailCard({
	formDataFormId,
	agent,
	onEdit,
	onDelete,
}: EmailCardProps) {
	const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border bg-background shadow transition-all hover:shadow-md">
			<div className="p-6">
				<div className="mb-4 flex flex-col items-start justify-between gap-2">
					<h3 className="font-semibold text-xl tracking-tight">
						表单ID: {formDataFormId}
					</h3>
					<p className="max-w-full break-all font-mono text-gray-500 text-sm">
						<span className="font-semibold">webhook:</span>{" "}
						{`${env.NEXT_PUBLIC_APP_URL}/api/webhooks/email/${formDataFormId}`}
					</p>
				</div>

				{agent && <Badge variant="secondary">AI Agent: {agent.name}</Badge>}
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
										onClick={() => setIsTestDialogOpen(true)}
									>
										<MailIcon
											className="h-5 w-5 text-gray-500"
											aria-hidden="true"
										/>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>测试</p>
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

			<EmailTestDialog
				open={isTestDialogOpen}
				onOpenChange={setIsTestDialogOpen}
				formDataFormId={formDataFormId}
			/>
		</div>
	);
}
