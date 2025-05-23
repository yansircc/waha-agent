"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { MailIcon, PenIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import type { FreeEmailFormInput } from "../types";
import { FreeEmailTestDialog } from "./free-email-test-dialog";

interface FreeEmailCardProps {
	emailData: FreeEmailFormInput & {
		id: string;
		createdAt?: Date | null;
		agent?: {
			id: string;
			name: string;
		};
	};
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
}

export function FreeEmailCard({
	emailData,
	onEdit,
	onDelete,
}: FreeEmailCardProps) {
	const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

	const { id, email, plunkApiKey, wechatPushApiKey, agent } = emailData;

	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border bg-background shadow transition-all hover:shadow-md">
			<div className="flex flex-col gap-2 p-6">
				<h3 className="font-semibold text-xl tracking-tight">{email}</h3>

				<div className="flex flex-wrap gap-2">
					{agent && (
						<Badge variant="default" className="bg-purple-100 text-purple-800">
							AI Agent: {agent.name}
						</Badge>
					)}

					{plunkApiKey ? (
						<Badge variant="secondary" className="bg-green-100 text-green-800">
							Plunk API已配置
						</Badge>
					) : (
						<Badge variant="destructive">Plunk API未配置</Badge>
					)}

					{wechatPushApiKey ? (
						<Badge variant="outline" className="bg-blue-50">
							微信推送已启用
						</Badge>
					) : (
						<Badge variant="outline" className="bg-gray-50">
							微信推送未配置
						</Badge>
					)}
				</div>
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
										onClick={() => onEdit(id)}
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
										onClick={() => onDelete(id)}
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

			<FreeEmailTestDialog
				open={isTestDialogOpen}
				onOpenChange={setIsTestDialogOpen}
				emailConfig={emailData}
			/>
		</div>
	);
}
