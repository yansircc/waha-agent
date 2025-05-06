"use client";

import type { vectorizeDocument } from "@/trigger/vectorize-document";
import { api } from "@/utils/api";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useEffect, useRef } from "react";
import { documentVectorizationRuns } from "./use-documents";

interface UseDocumentVectorizationProps {
	documentId: string;
	onCompleted?: (success: boolean) => void;
}

/**
 * Hook to track the status of a document vectorization task
 */
export function useDocumentVectorization({
	documentId,
	onCompleted,
}: UseDocumentVectorizationProps) {
	const utils = api.useUtils();

	// Get the run information for this document
	const runInfo = documentVectorizationRuns[documentId];

	// 使用ref来标记任务是否已经完成，避免重复处理
	const taskCompletedRef = useRef(false);

	// Use the Trigger.dev hook to track the run status
	const { run, error } = useRealtimeRun<typeof vectorizeDocument>(
		runInfo?.runId || "",
		{
			accessToken: runInfo?.token || "",
			enabled: !!runInfo?.runId && !!runInfo?.token,
		},
	);

	// Update document status when the run completes
	useEffect(() => {
		// 如果没有run或runInfo，或者任务已经被标记为完成，则不做任何事
		if (!run || !runInfo?.kbId || taskCompletedRef.current) return;

		// 只在状态是COMPLETED或FAILED时更新
		if (run.status !== "COMPLETED" && run.status !== "FAILED") return;

		// 标记任务已完成，避免重复处理
		taskCompletedRef.current = true;

		const updateStatus = async () => {
			try {
				if (run.status === "COMPLETED" && run.output) {
					// Update document status to completed
					await utils.client.kbs.updateDocumentStatus.mutate({
						id: documentId,
						status: "vectorized",
						kbId: runInfo.kbId,
					});

					// Trigger callback
					onCompleted?.(true);

					// Refresh the documents list
					await utils.kbs.getDocuments.invalidate({ kbId: runInfo.kbId });
				} else if (run.status === "FAILED") {
					// Update document status to failed
					await utils.client.kbs.updateDocumentStatus.mutate({
						id: documentId,
						status: "failed",
						kbId: runInfo.kbId,
					});

					// Trigger callback
					onCompleted?.(false);

					// Refresh the documents list
					await utils.kbs.getDocuments.invalidate({ kbId: runInfo.kbId });
				}

				// 执行完所有操作后，安全地删除引用
				// 使用setTimeout将删除操作移至下一个事件循环，避免影响当前渲染
				setTimeout(() => {
					if (documentVectorizationRuns[documentId]) {
						delete documentVectorizationRuns[documentId];
					}
				}, 0);
			} catch (error) {
				console.error("Failed to update document status:", error);
			}
		};

		// 执行状态更新
		void updateStatus();
	}, [documentId, onCompleted, run, runInfo?.kbId, utils]);

	return {
		run,
		error,
		isVectorizing: run?.status === "EXECUTING",
		isCompleted: run?.status === "COMPLETED",
		isFailed: run?.status === "FAILED",
		success: run?.output?.success ?? false,
		chunkCount: run?.output?.chunkCount,
		errorMessage: run?.output?.error || error?.message,
	};
}
