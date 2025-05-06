"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useDocumentVectorization } from "../hooks";

interface DocumentStatusProps {
	documentId: string;
	onStatusChange?: (success: boolean) => void;
}

export function DocumentStatus({
	documentId,
	onStatusChange,
}: DocumentStatusProps) {
	const { isVectorizing, isCompleted, isFailed, chunkCount, errorMessage } =
		useDocumentVectorization({
			documentId,
			onCompleted: onStatusChange,
		});

	// Don't render any UI unless there's a clear status
	if (!isVectorizing && !isCompleted && !isFailed) {
		return null;
	}

	if (isVectorizing) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger className="flex items-center">
						<Loader2 className="mr-1 h-4 w-4 animate-spin text-blue-500" />
						<span className="text-blue-500 text-xs">处理中</span>
					</TooltipTrigger>
					<TooltipContent>
						<p>正在向量化文档...</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	if (isCompleted) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger className="flex items-center">
						<Check className="mr-1 h-4 w-4 text-green-500" />
						<span className="text-green-500 text-xs">完成</span>
					</TooltipTrigger>
					<TooltipContent>
						<p>已成功向量化 {chunkCount || "多个"} 个块</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	if (isFailed) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger className="flex items-center">
						<AlertCircle className="mr-1 h-4 w-4 text-red-500" />
						<span className="text-red-500 text-xs">失败</span>
					</TooltipTrigger>
					<TooltipContent>
						<p>向量化失败: {errorMessage || "未知错误"}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	return null;
}
