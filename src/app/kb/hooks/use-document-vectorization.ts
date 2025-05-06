"use client";

import type { vectorizeDocument } from "@/trigger/vectorize-document";
import { api } from "@/utils/api";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useEffect, useRef } from "react";
import { useKbStore } from "./store";

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
	const removeProcessingDocId = useKbStore(
		(state) => state.removeProcessingDocId,
	);
	const removeVectorizationRun = useKbStore(
		(state) => state.removeVectorizationRun,
	);
	const vectorizationRuns = useKbStore(
		(state) => state.documentVectorizationRuns,
	);

	// Get the run information for this document
	const runInfo = vectorizationRuns[documentId];

	// Track if task has completed
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
		// If no run or runInfo, or task already marked as complete, do nothing
		if (!run || !runInfo?.kbId || taskCompletedRef.current) return;

		// Only update when status is COMPLETED or FAILED
		if (run.status !== "COMPLETED" && run.status !== "FAILED") return;

		// Mark task as completed to avoid duplicate processing
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

					// Remove from processing IDs
					removeProcessingDocId(documentId);

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

					// Remove from processing IDs
					removeProcessingDocId(documentId);

					// Trigger callback
					onCompleted?.(false);

					// Refresh the documents list
					await utils.kbs.getDocuments.invalidate({ kbId: runInfo.kbId });
				}

				// Clean up reference after all operations
				// Use setTimeout to move deletion to next event loop to avoid affecting current render
				setTimeout(() => {
					removeVectorizationRun(documentId);
				}, 0);
			} catch (error) {
				console.error("Failed to update document status:", error);
			}
		};

		// Execute status update
		void updateStatus();
	}, [
		documentId,
		onCompleted,
		run,
		runInfo?.kbId,
		utils,
		removeProcessingDocId,
		removeVectorizationRun,
	]);

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
