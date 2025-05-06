"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useDocumentVectorization } from "../hooks/use-document-vectorization";

interface DocumentStatusProps {
	documentId: string;
	onStatusChange?: (success: boolean) => void;
	updateProcessingStatus?: (documentId: string, isProcessing: boolean) => void;
}

export function DocumentStatus({
	documentId,
	onStatusChange,
	updateProcessingStatus,
}: DocumentStatusProps) {
	const { isVectorizing, isCompleted, isFailed, chunkCount, errorMessage } =
		useDocumentVectorization({
			documentId,
			onCompleted: onStatusChange,
		});

	// 使用ref跟踪上一次的处理状态，避免不必要的更新
	const prevProcessingRef = useRef(false);

	// 当处理状态变化时，通知父组件，但避免不必要的更新
	useEffect(() => {
		// 只有当状态真正发生变化时才通知父组件
		if (updateProcessingStatus && prevProcessingRef.current !== isVectorizing) {
			updateProcessingStatus(documentId, isVectorizing);
			prevProcessingRef.current = isVectorizing;
		}
	}, [documentId, isVectorizing, updateProcessingStatus]);

	// 不要渲染任何UI，除非有明确的状态
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
