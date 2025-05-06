"use client";

import { api } from "@/utils/api";
import { useCallback, useEffect, useState } from "react";
import type { SessionJob, SessionOperation } from "./session-queue";

interface UseSessionQueueOptions {
	/**
	 * 操作类型，默认为 create
	 */
	operation?: SessionOperation;

	/**
	 * 当会话创建请求入队后的回调
	 */
	onQueued?: (job: SessionJob) => void;

	/**
	 * 当会话创建请求从队列中激活后的回调
	 */
	onActive?: (job: SessionJob) => void;

	/**
	 * 当会话创建请求失败（或超时）后的回调
	 */
	onFailed?: (job: SessionJob) => void;

	/**
	 * 当会话创建请求完成后的回调
	 */
	onCompleted?: (job: SessionJob) => void;
}

interface SessionQueueState {
	/**
	 * 当前用户在队列中的位置 (undefined表示未入队)
	 */
	queuePosition?: number;

	/**
	 * 队列状态
	 */
	status: "idle" | "queued" | "active" | "completed" | "error" | "timeout";

	/**
	 * 当前任务
	 */
	currentJob?: SessionJob;

	/**
	 * 等待中的任务数
	 */
	waitingCount: number;

	/**
	 * 活跃中的任务数
	 */
	activeCount: number;

	/**
	 * 预估等待时间（秒）
	 */
	estimatedWaitTime?: number;

	/**
	 * 错误信息
	 */
	errorMessage?: string;

	/**
	 * 操作类型
	 */
	operation: SessionOperation;
}

// 定义API返回的数据类型
interface QueueStatsData {
	waitingCount: number;
	activeCount: number;
	totalJobs: number;
	queuePositions: Record<string, number>;
}

/**
 * 会话队列Hook，用于管理WhatsApp会话操作的并发限制
 */
export function useSessionQueue({
	operation = "create",
	onQueued,
	onActive,
	onFailed,
	onCompleted,
}: UseSessionQueueOptions = {}) {
	// 队列状态
	const [queueState, setQueueState] = useState<SessionQueueState>({
		status: "idle",
		waitingCount: 0,
		activeCount: 0,
		operation,
	});

	// 队列操作API
	const addToQueueMutation = api.sessionQueue.addToQueue.useMutation();
	const completeJobMutation = api.sessionQueue.completeJob.useMutation();

	// 检查当前实例是否有活跃任务
	const checkActiveJobQuery = api.sessionQueue.checkActiveJob.useQuery(
		{
			instanceId: queueState.currentJob?.instanceId || "",
			operation: queueState.operation,
		},
		{
			enabled:
				queueState.status === "active" && !!queueState.currentJob?.instanceId,
			refetchInterval: 5000, // 每5秒检查一次活跃任务状态
		},
	);

	// 队列统计信息查询
	const statsQuery = api.sessionQueue.getStats.useQuery(
		{ operation: queueState.operation },
		{
			refetchInterval: 5000, // 每5秒自动刷新一次
			enabled: queueState.status === "queued" || queueState.status === "active", // 只在排队或激活时刷新
		},
	);

	// 使用useEffect处理数据更新
	useEffect(() => {
		// 确保有数据且当前处于队列中
		if (
			statsQuery.data &&
			(queueState.status === "queued" || queueState.status === "active") &&
			queueState.currentJob
		) {
			const data = statsQuery.data as QueueStatsData;

			// 更新队列位置和预估等待时间
			const queuePosition = data.queuePositions[queueState.currentJob.id];
			const estimatedWaitTime =
				queuePosition !== undefined
					? queuePosition * 5 // 假设每个任务平均需要5秒
					: undefined;

			setQueueState((prev) => ({
				...prev,
				queuePosition,
				waitingCount: data.waitingCount,
				activeCount: data.activeCount,
				estimatedWaitTime,
			}));
		}
	}, [statsQuery.data, queueState.status, queueState.currentJob]);

	// 监测任务状态变化，特别是处理超时情况
	useEffect(() => {
		if (queueState.status === "active" && checkActiveJobQuery.data) {
			const { hasActiveJob, job } = checkActiveJobQuery.data;

			// 如果任务不再活跃，可能是完成了或者超时失败了
			if (!hasActiveJob && queueState.currentJob) {
				// 这里可以判断任务状态，如果是failed则认为是超时
				if (job && job.status === "failed") {
					setQueueState((prev) => ({
						...prev,
						status: "timeout",
						errorMessage: "操作超时，请稍后重试",
					}));

					// 调用失败回调
					onFailed?.(queueState.currentJob);
				}
			}
		}
	}, [
		checkActiveJobQuery.data,
		queueState.currentJob,
		queueState.status,
		onFailed,
	]);

	// 添加任务到队列并执行操作
	const executeQueuedOperation = useCallback(
		async (params: {
			instanceId: string;
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			executeOperation: () => Promise<any>;
		}) => {
			const { instanceId, executeOperation } = params;

			// 先添加到队列
			const result = await addToQueueMutation.mutateAsync({
				instanceId,
				operation: queueState.operation as
					| "start"
					| "create"
					| "stop"
					| "logout"
					| "restart",
			});

			const job = result.job;
			if (!job) {
				throw new Error("无法添加任务到队列");
			}

			// 更新队列状态
			setQueueState((prev) => ({
				...prev,
				status: job.status === "active" ? "active" : "queued",
				currentJob: job,
			}));

			// 任务状态为active时直接执行操作
			if (job.status === "active") {
				onActive?.(job);

				try {
					// 执行操作
					const operationResult = await executeOperation();

					// 操作成功后，直接标记任务为完成
					if (operationResult) {
						// 标记任务为完成
						await completeJobMutation.mutateAsync({ jobId: job.id });

						// 更新状态
						setQueueState((prev) => ({
							...prev,
							status: "completed",
						}));

						// 调用完成回调
						onCompleted?.(job);
					}

					return operationResult;
				} catch (error) {
					// 如果操作失败，则标记任务为失败
					console.error(`执行${queueState.operation}操作失败:`, error);
					setQueueState((prev) => ({
						...prev,
						status: "error",
						errorMessage: (error as Error).message,
					}));
					throw error;
				}
			}

			// 任务在等待队列中，需等待回调
			onQueued?.(job);
			return {
				success: true,
				message: `会话${queueState.operation}请求已加入队列`,
				queueId: job.id,
			};
		},
		[
			addToQueueMutation,
			completeJobMutation,
			onActive,
			onQueued,
			onCompleted,
			queueState.operation,
		],
	);

	// 手动完成任务
	const completeJob = useCallback(
		async (jobId: string) => {
			if (!jobId) return false;

			try {
				const result = await completeJobMutation.mutateAsync({ jobId });

				if (result.success && queueState.currentJob?.id === jobId) {
					setQueueState((prev) => ({
						...prev,
						status: "completed",
					}));

					// 调用完成回调
					if (queueState.currentJob) {
						onCompleted?.(queueState.currentJob);
					}
				}

				return result.success;
			} catch (error) {
				console.error("手动完成任务失败:", error);
				return false;
			}
		},
		[completeJobMutation, queueState.currentJob, onCompleted],
	);

	// 重试操作
	const retry = useCallback(
		async (params: {
			instanceId: string;
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			executeOperation: () => Promise<any>;
		}) => {
			if (!queueState.currentJob?.instanceId) return;

			// 重置状态
			setQueueState((prev) => ({
				...prev,
				status: "idle",
				errorMessage: undefined,
			}));

			// 重新尝试操作
			return executeQueuedOperation(params);
		},
		[queueState.currentJob?.instanceId, executeQueuedOperation],
	);

	// 刷新队列状态
	const refreshQueueStatus = useCallback(() => {
		if (queueState.status === "queued" || queueState.status === "active") {
			statsQuery.refetch();

			if (queueState.status === "active" && queueState.currentJob?.instanceId) {
				checkActiveJobQuery.refetch();
			}
		}
	}, [
		queueState.status,
		queueState.currentJob?.instanceId,
		statsQuery,
		checkActiveJobQuery,
	]);

	return {
		queueState,
		executeQueuedOperation,
		refreshQueueStatus,
		retry,
		completeJob,
		isLoading: addToQueueMutation.isPending || completeJobMutation.isPending,
	};
}
