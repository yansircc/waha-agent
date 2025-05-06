"use client";

import { useSessionQueue } from "@/lib/queue/use-session-queue";
import { api } from "@/utils/api";
import { useCallback } from "react";
import { toast } from "sonner";
import { useInstances } from "./use-instances";

export function useWhatsAppSession() {
	const { updateInstance } = useInstances();

	// 使用会话队列
	const {
		queueState,
		createSessionAsync,
		retry: retrySessionCreate,
		completeJob,
		isLoading: isQueueLoading,
	} = useSessionQueue({
		onQueued: (job) => {
			console.log("会话创建请求已加入队列", job);
		},
		onActive: (job) => {
			console.log("正在处理会话创建请求", job);
		},
		onFailed: (job) => {
			console.log("会话创建请求失败或超时", job);
			toast.error("创建会话超时，已自动为您重新排队");

			// 实例状态更新为断开
			if (job.instanceId) {
				void updateInstance({
					id: job.instanceId,
					status: "disconnected",
				});
			}
		},
		onCompleted: (job) => {
			console.log("会话创建请求完成", job);

			// 实例状态更新为已连接
			if (job.instanceId) {
				void updateInstance({
					id: job.instanceId,
					status: "connected",
				});
			}
		},
	});

	// Get mutations with built-in loading states
	const createSessionMutation = api.wahaSessions.create.useMutation();
	const startSessionMutation = api.wahaSessions.start.useMutation();
	const stopSessionMutation = api.wahaSessions.stop.useMutation();
	const logoutSessionMutation = api.wahaSessions.logout.useMutation();
	const restartSessionMutation = api.wahaSessions.restart.useMutation();

	// Session creation (uses server-side webhook configuration)
	const createSession = useCallback(
		async (instanceId: string) => {
			// 通过队列创建会话
			const result = await createSessionAsync({ instanceId });

			// 更新实例状态为连接中
			// 注意: 现在我们在 onCompleted 回调中更新状态为已连接
			await updateInstance({
				id: instanceId,
				status: "connecting",
			});

			return result;
		},
		[updateInstance, createSessionAsync],
	);

	// Retry session creation
	const retrySession = useCallback(
		async (instanceId: string) => {
			try {
				// 先尝试通过队列重试
				if (
					queueState.currentJob?.instanceId === instanceId &&
					queueState.status === "timeout"
				) {
					await retrySessionCreate();
					toast.success("正在重新创建会话");
				} else {
					// 否则重新创建
					await createSession(instanceId);
					toast.success("正在创建会话");
				}

				// 更新实例状态
				await updateInstance({
					id: instanceId,
					status: "connecting",
				});
			} catch (error) {
				toast.error(`重试创建会话失败: ${(error as Error).message}`);
			}
		},
		[queueState, retrySessionCreate, createSession, updateInstance],
	);

	// Start session
	const startSession = useCallback(
		async (instanceId: string) => {
			// Update instance status to connecting
			await updateInstance({
				id: instanceId,
				status: "connecting",
			});

			return startSessionMutation.mutateAsync({
				instanceId,
			});
		},
		[updateInstance, startSessionMutation],
	);

	// Stop session
	const stopSession = useCallback(
		async (instanceId: string) => {
			return stopSessionMutation.mutateAsync({ instanceId });
		},
		[stopSessionMutation],
	);

	// Logout session
	const logoutSession = useCallback(
		async (instanceId: string) => {
			return logoutSessionMutation.mutateAsync({ instanceId });
		},
		[logoutSessionMutation],
	);

	// Restart session
	const restartSession = useCallback(
		async (instanceId: string) => {
			// Update instance status to connecting
			await updateInstance({
				id: instanceId,
				status: "connecting",
			});

			return restartSessionMutation.mutateAsync({
				instanceId,
			});
		},
		[updateInstance, restartSessionMutation],
	);

	// Display QR code dialog
	const displayQRDialog = useCallback((instanceId: string) => {
		const event = new CustomEvent("open-qr-dialog", {
			detail: { instanceId },
		});
		document.dispatchEvent(event);
	}, []);

	return {
		isLoading:
			isQueueLoading ||
			createSessionMutation.isPending ||
			startSessionMutation.isPending ||
			stopSessionMutation.isPending ||
			logoutSessionMutation.isPending ||
			restartSessionMutation.isPending,
		queueState,
		createSession,
		retrySession,
		startSession,
		stopSession,
		logoutSession,
		restartSession,
		displayQRDialog,
		completeQueueJob: completeJob,
	};
}
