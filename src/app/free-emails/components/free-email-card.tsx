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
	emailData: {
		id: string;
		emailAddress: string;
		alias: string | null;
		plunkApiKey: string | null;
		wechatPushApiKey: string | null;
		setupCompleted: boolean;
		formSubmitActivated: boolean;
		createdAt?: Date | null;
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

	const {
		id,
		emailAddress,
		alias,
		plunkApiKey,
		wechatPushApiKey,
		setupCompleted,
		formSubmitActivated,
	} = emailData;

	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border bg-background shadow transition-all hover:shadow-md">
			<div className="p-6">
				<div className="mb-4 flex flex-col items-start justify-between gap-2">
					<h3 className="font-semibold text-xl tracking-tight">
						{emailAddress}
					</h3>
					{alias && (
						<p className="max-w-full break-all font-mono text-gray-500 text-sm">
							<span className="font-semibold">FormSubmit Alias:</span> {alias}
						</p>
					)}
				</div>

				<div className="flex flex-wrap gap-2">
					{formSubmitActivated ? (
						<Badge variant="secondary" className="bg-green-100 text-green-800">
							FormSubmit Activated
						</Badge>
					) : (
						<Badge variant="destructive">FormSubmit Pending</Badge>
					)}

					{setupCompleted ? (
						<Badge variant="outline" className="bg-green-50">
							Setup Complete
						</Badge>
					) : (
						<Badge variant="outline" className="bg-yellow-50">
							Setup Incomplete
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
										disabled={!setupCompleted || !formSubmitActivated || !alias}
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

			{formSubmitActivated && alias && (
				<FreeEmailTestDialog
					open={isTestDialogOpen}
					onOpenChange={setIsTestDialogOpen}
					alias={alias}
				/>
			)}
		</div>
	);
}
