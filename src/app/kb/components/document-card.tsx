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
	FileDown,
	Link,
	Loader2,
	Trash2,
	Wand2,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

	// Status label
	const statusLabel = isProcessing
		? "处理中"
		: isCompleted
			? "已完成"
			: isFailed
				? "处理失败"
				: "待处理";

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

	// Copy file link
	const copyFileLink = () => {
		if (document.fileUrl) {
			navigator.clipboard.writeText(document.fileUrl);
			toast.success("文件链接已复制到剪贴板");
		} else {
			toast.error("文件链接不可用");
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
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="font-medium text-base">{document.name}</CardTitle>
				<div
					className={`rounded-full px-2 py-1 text-xs ${
						isProcessing
							? "bg-blue-100 text-blue-800"
							: isCompleted
								? "bg-green-100 text-green-800"
								: isFailed
									? "bg-red-100 text-red-800"
									: "bg-gray-100 text-gray-800"
					}`}
				>
					{statusLabel}
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
							: "No date"}
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex justify-between gap-2">
				<div className="flex gap-2">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={
										isCompleted
											? "default"
											: isFailed
												? "destructive"
												: "outline"
									}
									size="sm"
									disabled={isProcessing || isCompleted}
									onClick={handleVectorize}
								>
									{isProcessing ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											处理中
										</>
									) : isCompleted ? (
										<>
											<Check className="mr-2 h-4 w-4" />
											已完成
										</>
									) : isFailed ? (
										<>
											<XCircle className="mr-2 h-4 w-4" />
											重试
										</>
									) : (
										<>
											<Wand2 className="mr-2 h-4 w-4" />
											投喂文档
										</>
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{isProcessing
									? "Document is being processed, please wait"
									: isCompleted
										? "Document has been vectorized, can be used for knowledge base query"
										: isFailed
											? "Processing failed, click retry"
											: "Vectorize document to support knowledge base query"}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					{document.fileUrl && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="outline" size="sm" onClick={openFile}>
										<ExternalLink className="mr-2 h-4 w-4" />
										预览
									</Button>
								</TooltipTrigger>
								<TooltipContent>在新窗口中打开文件</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}

					{document.fileUrl && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="outline" size="sm" onClick={copyFileLink}>
										<Link className="mr-2 h-4 w-4" />
										复制链接
									</Button>
								</TooltipTrigger>
								<TooltipContent>复制文件链接到剪贴板</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDelete}
								className="text-destructive hover:text-destructive"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>删除文档</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</CardFooter>
		</Card>
	);
}
