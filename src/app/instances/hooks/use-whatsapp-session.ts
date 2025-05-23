"use client";

import { api } from "@/utils/api";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useInstances } from "./use-instances";

export function useWhatsAppSession() {
	const { updateInstance } = useInstances();

	// 获取API mutations
	const createSessionMutation = api.wahaSessions.create.useMutation();
	const startSessionMutation = api.wahaSessions.start.useMutation();
	const stopSessionMutation = api.wahaSessions.stop.useMutation();
	const logoutSessionMutation = api.wahaSessions.logout.useMutation();
	const restartSessionMutation = api.wahaSessions.restart.useMutation();

	// 简化的加载状态，只依赖 mutations
	const isLoading = useMemo(
		() =>
			createSessionMutation.isPending ||
			startSessionMutation.isPending ||
			stopSessionMutation.isPending ||
			logoutSessionMutation.isPending ||
			restartSessionMutation.isPending,
		[
			createSessionMutation.isPending,
			startSessionMutation.isPending,
			stopSessionMutation.isPending,
			logoutSessionMutation.isPending,
			restartSessionMutation.isPending,
		],
	);

	// Session creation (直接执行，不通过队列)
	const createSession = useCallback(
		async (
			instanceId: string,
			userWahaApiEndpoint?: string,
			userWahaApiKey?: string,
		) => {
			try {
				// 实例状态更新为连接中
				await updateInstance({
					id: instanceId,
					status: "connecting",
				});

				// 直接执行创建会话
				const result = await createSessionMutation.mutateAsync({
					instanceId,
					userWahaApiEndpoint,
					userWahaApiKey,
				});

				// 实例状态更新为已连接
				await updateInstance({
					id: instanceId,
					status: "connected",
				});

				return result;
			} catch (error) {
				// 失败时更新状态为断开
				await updateInstance({
					id: instanceId,
					status: "disconnected",
				});
				throw error;
			}
		},
		[updateInstance, createSessionMutation],
	);

	// Start session (直接执行，不通过队列)
	const startSession = useCallback(
		async (
			instanceId: string,
			userWahaApiEndpoint?: string,
			userWahaApiKey?: string,
		) => {
			try {
				// 实例状态更新为连接中
				await updateInstance({
					id: instanceId,
					status: "connecting",
				});

				// 直接执行启动会话
				const result = await startSessionMutation.mutateAsync({
					instanceId,
					userWahaApiEndpoint,
					userWahaApiKey,
				});

				// 实例状态更新为已连接
				await updateInstance({
					id: instanceId,
					status: "connected",
				});

				return result;
			} catch (error) {
				// 失败时更新状态为断开
				await updateInstance({
					id: instanceId,
					status: "disconnected",
				});
				throw error;
			}
		},
		[updateInstance, startSessionMutation],
	);

	// Stop session (直接执行，不通过队列)
	const stopSession = useCallback(
		async (
			instanceId: string,
			userWahaApiEndpoint?: string,
			userWahaApiKey?: string,
		) => {
			try {
				// 直接执行停止会话
				const result = await stopSessionMutation.mutateAsync({
					instanceId,
					userWahaApiEndpoint,
					userWahaApiKey,
				});

				// 实例状态更新为断开
				await updateInstance({
					id: instanceId,
					status: "disconnected",
				});

				return result;
			} catch (error) {
				console.error("停止会话失败:", error);
				throw error;
			}
		},
		[updateInstance, stopSessionMutation],
	);

	// Logout session (直接执行，不通过队列)
	const logoutSession = useCallback(
		async (
			instanceId: string,
			userWahaApiEndpoint?: string,
			userWahaApiKey?: string,
		) => {
			try {
				// 直接执行退出会话
				const result = await logoutSessionMutation.mutateAsync({
					instanceId,
					userWahaApiEndpoint,
					userWahaApiKey,
				});

				// 实例状态更新为断开
				await updateInstance({
					id: instanceId,
					status: "disconnected",
				});

				return result;
			} catch (error) {
				console.error("退出会话失败:", error);
				throw error;
			}
		},
		[updateInstance, logoutSessionMutation],
	);

	// Restart session (直接执行，不通过队列)
	const restartSession = useCallback(
		async (
			instanceId: string,
			userWahaApiEndpoint?: string,
			userWahaApiKey?: string,
		) => {
			try {
				// 实例状态更新为连接中
				await updateInstance({
					id: instanceId,
					status: "connecting",
				});

				// 直接执行重启会话
				const result = await restartSessionMutation.mutateAsync({
					instanceId,
					userWahaApiEndpoint,
					userWahaApiKey,
				});

				// 实例状态更新为已连接
				await updateInstance({
					id: instanceId,
					status: "connected",
				});

				return result;
			} catch (error) {
				// 失败时更新状态为断开
				await updateInstance({
					id: instanceId,
					status: "disconnected",
				});
				throw error;
			}
		},
		[updateInstance, restartSessionMutation],
	);

	// Retry session creation (直接重试，不通过队列)
	const retrySession = useCallback(
		async (
			instanceId: string,
			userWahaApiEndpoint?: string,
			userWahaApiKey?: string,
		) => {
			try {
				// 默认重试创建会话
				await createSession(instanceId, userWahaApiEndpoint, userWahaApiKey);
				toast.success("正在重新创建会话");
			} catch (error) {
				toast.error(`重试操作失败: ${(error as Error).message}`);
				throw error;
			}
		},
		[createSession],
	);

	// Display QR code dialog
	const displayQRDialog = useCallback(
		(
			instanceId: string,
			userWahaApiEndpoint?: string,
			userWahaApiKey?: string,
		) => {
			const event = new CustomEvent("open-qr-dialog", {
				detail: { instanceId, userWahaApiEndpoint, userWahaApiKey },
			});
			document.dispatchEvent(event);
		},
		[],
	);

	// 返回空的队列状态以保持接口兼容性
	const emptyQueueState = {
		status: "idle" as const,
		queuePosition: undefined,
		estimatedWaitTime: undefined,
		waitingCount: undefined,
		activeCount: undefined,
		errorMessage: undefined,
		currentJob: undefined,
		operation: "create" as const,
	};

	return {
		isLoading,
		queueState: {
			create: emptyQueueState,
			start: emptyQueueState,
			stop: emptyQueueState,
			logout: emptyQueueState,
			restart: emptyQueueState,
		},
		createSession,
		retrySession,
		startSession,
		stopSession,
		logoutSession,
		restartSession,
		displayQRDialog,
	};
}
