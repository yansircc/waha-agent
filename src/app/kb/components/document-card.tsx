"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatFileSize } from "@/lib/utils";
import type { Document } from "@/types/document";
import {
	Check,
	ExternalLink,
	Loader2,
	Trash2,
	Wand2,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DocumentStatusBadge } from "./status-badge";

interface DocumentCardProps {
	document: Document;
	onDelete: (id: string, kbId: string) => void;
	onVectorize: (id: string) => void;
}

export function DocumentCard({
	document,
	onDelete,
	onVectorize,
}: DocumentCardProps) {
	const [isLocalProcessing, setIsLocalProcessing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Reset local processing state when document status changes
	useEffect(() => {
		if (
			document.vectorizationStatus === "completed" ||
			document.vectorizationStatus === "failed"
		) {
			setIsLocalProcessing(false);
		}
	}, [document.vectorizationStatus]);

	// Vectorization status
	const isProcessing =
		isLocalProcessing || document.vectorizationStatus === "processing";
	const isPending =
		document.vectorizationStatus === "pending" || !document.vectorizationStatus;
	const isFailed = document.vectorizationStatus === "failed";
	const isCompleted = document.vectorizationStatus === "completed";

	// Handle vectorization request
	const handleVectorize = async () => {
		setIsLocalProcessing(true);
		try {
			await onVectorize(document.id);
			// The UI will immediately update to processing state, actual status updates via polling
		} catch (error) {
			toast.error("投喂请求失败，请稍后再试");
			setIsLocalProcessing(false);
		}
	};

	// Open file
	const openFile = () => {
		if (document.fileUrl) {
			window.open(document.fileUrl, "_blank");
		} else {
			toast.error("文件链接不可用");
		}
	};

	// Handle document deletion
	const handleDelete = async () => {
		if (!document.kbId) return;

		setIsDeleting(true);
		try {
			await onDelete(document.id, document.kbId);
			// The parent component will handle removing this card from the list
		} catch (error) {
			setIsDeleting(false);
			toast.error("删除文档失败");
		}
	};

	if (isDeleting) {
		return (
			<Card className="opacity-60 transition-opacity">
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<CardTitle className="font-medium text-base">
						{document.name}
					</CardTitle>
					<div className="rounded-full bg-red-100 px-2 py-1 text-red-800 text-xs">
						删除中...
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between text-sm">
						<div className="text-muted-foreground">
							{formatFileSize(document.fileSize || 0)}
						</div>
						<div className="text-muted-foreground">
							{document.createdAt
								? new Date(document.createdAt).toLocaleDateString()
								: "没有日期"}
						</div>
					</div>
				</CardContent>
				<CardFooter className="flex justify-center">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</CardFooter>
			</Card>
		);
	}

	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border bg-background shadow transition-all hover:shadow-md">
			<div className="flex flex-col gap-4 p-6">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold text-xl tracking-tight">
						{document.name}
					</h3>
					<DocumentStatusBadge
						status={document.vectorizationStatus}
						isProcessing={isLocalProcessing}
					/>
				</div>

				<div className="flex items-center justify-between text-sm">
					<div className="text-muted-foreground">
						{formatFileSize(document.fileSize || 0)}
					</div>
					<div className="text-muted-foreground">
						{document.createdAt
							? new Date(document.createdAt).toLocaleDateString()
							: "没有日期"}
					</div>
				</div>
			</div>

			<div className="mt-auto border-t">
				<div className="-mt-px flex divide-x divide-gray-200">
					{!isCompleted && !isProcessing && (
						<div className="flex w-0 flex-1">
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											className="relative inline-flex w-0 flex-1 cursor-pointer items-center justify-center rounded-bl-lg border border-transparent py-4"
											disabled={isProcessing}
											onClick={handleVectorize}
										>
											{isProcessing ? (
												<Loader2 className="h-5 w-5 animate-spin text-gray-500" />
											) : isFailed ? (
												<XCircle className="h-5 w-5 text-red-500" />
											) : (
												<Wand2 className="h-5 w-5 text-gray-500" />
											)}
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										<p>投喂文档</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					)}

					{document.fileUrl && (
						<div
							className={`flex w-0 flex-1 ${!isCompleted && !isProcessing ? "-ml-px" : ""}`}
						>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											className={`relative inline-flex w-0 flex-1 cursor-pointer items-center justify-center border border-transparent py-4 ${!isCompleted && !isProcessing ? "" : "rounded-bl-lg"}`}
											onClick={openFile}
										>
											<ExternalLink
												className="h-5 w-5 text-gray-500"
												aria-hidden="true"
											/>
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										<p>预览</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					)}

					<div className="-ml-px flex w-0 flex-1">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										className="relative inline-flex w-0 flex-1 cursor-pointer items-center justify-center rounded-br-lg border border-transparent py-4"
										onClick={handleDelete}
									>
										<Trash2
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
		</div>
	);
}
