"use client";

import { useSessionQueue } from "@/lib/queue/use-session-queue";
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

	// 为每种操作类型创建单独的会话队列Hook
	const createQueue = useSessionQueue({
		operation: "create",
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

	const startQueue = useSessionQueue({
		operation: "start",
		onQueued: (job) => {
			console.log("会话启动请求已加入队列", job);
			toast.info("启动请求已加入队列");
		},
		onActive: (job) => {
			console.log("正在处理会话启动请求", job);
		},
		onFailed: (job) => {
			console.log("会话启动请求失败或超时", job);
			toast.error("启动会话超时");

			// 实例状态更新为断开
			if (job.instanceId) {
				void updateInstance({
					id: job.instanceId,
					status: "disconnected",
				});
			}
		},
		onCompleted: (job) => {
			console.log("会话启动请求完成", job);

			// 实例状态更新为已连接
			if (job.instanceId) {
				void updateInstance({
					id: job.instanceId,
					status: "connected",
				});
			}
		},
	});

	const stopQueue = useSessionQueue({
		operation: "stop",
		onQueued: (job) => {
			console.log("会话停止请求已加入队列", job);
			toast.info("停止请求已加入队列");
		},
		onCompleted: (job) => {
			console.log("会话停止请求完成", job);

			// 实例状态更新为断开
			if (job.instanceId) {
				void updateInstance({
					id: job.instanceId,
					status: "disconnected",
				});
			}
		},
	});

	const logoutQueue = useSessionQueue({
		operation: "logout",
		onQueued: (job) => {
			console.log("会话退出请求已加入队列", job);
			toast.info("退出登录请求已加入队列");
		},
		onCompleted: (job) => {
			console.log("会话退出请求完成", job);

			// 实例状态更新为断开
			if (job.instanceId) {
				void updateInstance({
					id: job.instanceId,
					status: "disconnected",
				});
			}
		},
	});

	const restartQueue = useSessionQueue({
		operation: "restart",
		onQueued: (job) => {
			console.log("会话重启请求已加入队列", job);
			toast.info("重启请求已加入队列");
		},
		onActive: (job) => {
			console.log("正在处理会话重启请求", job);
		},
		onFailed: (job) => {
			console.log("会话重启请求失败或超时", job);
			toast.error("重启会话超时");
		},
		onCompleted: (job) => {
			console.log("会话重启请求完成", job);

			// 实例状态更新为已连接
			if (job.instanceId) {
				void updateInstance({
					id: job.instanceId,
					status: "connected",
				});
			}
		},
	});

	// 所有队列的加载状态
	const isLoading = useMemo(
		() =>
			createQueue.isLoading ||
			startQueue.isLoading ||
			stopQueue.isLoading ||
			logoutQueue.isLoading ||
			restartQueue.isLoading ||
			createSessionMutation.isPending ||
			startSessionMutation.isPending ||
			stopSessionMutation.isPending ||
			logoutSessionMutation.isPending ||
			restartSessionMutation.isPending,
		[
			createQueue.isLoading,
			startQueue.isLoading,
			stopQueue.isLoading,
			logoutQueue.isLoading,
			restartQueue.isLoading,
			createSessionMutation.isPending,
			startSessionMutation.isPending,
			stopSessionMutation.isPending,
			logoutSessionMutation.isPending,
			restartSessionMutation.isPending,
		],
	);

	// Session creation (uses server-side webhook configuration)
	const createSession = useCallback(
		async (instanceId: string, userWahaApiEndpoint?: string) => {
			// 实例状态更新为连接中
			await updateInstance({
				id: instanceId,
				status: "connecting",
			});

			// 通过队列创建会话
			return createQueue.executeQueuedOperation({
				instanceId,
				userWahaApiEndpoint,
				executeOperation: async () => {
					return createSessionMutation.mutateAsync({
						instanceId,
						userWahaApiEndpoint,
					});
				},
			});
		},
		[updateInstance, createQueue.executeQueuedOperation, createSessionMutation],
	);

	// Start session
	const startSession = useCallback(
		async (instanceId: string, userWahaApiEndpoint?: string) => {
			// 实例状态更新为连接中
			await updateInstance({
				id: instanceId,
				status: "connecting",
			});

			// 通过队列启动会话
			return startQueue.executeQueuedOperation({
				instanceId,
				userWahaApiEndpoint,
				executeOperation: async () => {
					return startSessionMutation.mutateAsync({
						instanceId,
						userWahaApiEndpoint,
					});
				},
			});
		},
		[updateInstance, startQueue.executeQueuedOperation, startSessionMutation],
	);

	// Stop session
	const stopSession = useCallback(
		async (instanceId: string, userWahaApiEndpoint?: string) => {
			// 通过队列停止会话
			return stopQueue.executeQueuedOperation({
				instanceId,
				userWahaApiEndpoint,
				executeOperation: async () => {
					return stopSessionMutation.mutateAsync({
						instanceId,
						userWahaApiEndpoint,
					});
				},
			});
		},
		[stopQueue.executeQueuedOperation, stopSessionMutation],
	);

	// Logout session
	const logoutSession = useCallback(
		async (instanceId: string, userWahaApiEndpoint?: string) => {
			// 通过队列退出会话
			return logoutQueue.executeQueuedOperation({
				instanceId,
				userWahaApiEndpoint,
				executeOperation: async () => {
					return logoutSessionMutation.mutateAsync({
						instanceId,
						userWahaApiEndpoint,
					});
				},
			});
		},
		[logoutQueue.executeQueuedOperation, logoutSessionMutation],
	);

	// Restart session
	const restartSession = useCallback(
		async (instanceId: string, userWahaApiEndpoint?: string) => {
			// 实例状态更新为连接中
			await updateInstance({
				id: instanceId,
				status: "connecting",
			});

			// 通过队列重启会话
			return restartQueue.executeQueuedOperation({
				instanceId,
				userWahaApiEndpoint,
				executeOperation: async () => {
					return restartSessionMutation.mutateAsync({
						instanceId,
						userWahaApiEndpoint,
					});
				},
			});
		},
		[
			updateInstance,
			restartQueue.executeQueuedOperation,
			restartSessionMutation,
		],
	);

	// Retry session creation
	const retrySession = useCallback(
		async (instanceId: string, userWahaApiEndpoint?: string) => {
			try {
				const operation = createQueue.queueState.operation;

				// 根据操作类型选择正确的队列和执行方法
				switch (operation) {
					case "create":
						await createSession(instanceId, userWahaApiEndpoint);
						toast.success("正在重新创建会话");
						break;
					case "start":
						await startSession(instanceId, userWahaApiEndpoint);
						toast.success("正在重新启动会话");
						break;
					case "restart":
						await restartSession(instanceId, userWahaApiEndpoint);
						toast.success("正在重新刷新会话");
						break;
					case "stop":
						await stopSession(instanceId, userWahaApiEndpoint);
						toast.success("正在重新停止会话");
						break;
					case "logout":
						await logoutSession(instanceId, userWahaApiEndpoint);
						toast.success("正在重新退出会话");
						break;
					default:
						// 如果不确定操作类型，默认创建会话
						await createSession(instanceId, userWahaApiEndpoint);
						toast.success("正在创建会话");
				}

				// 更新实例状态
				await updateInstance({
					id: instanceId,
					status: "connecting",
				});
			} catch (error) {
				toast.error(`重试操作失败: ${(error as Error).message}`);
			}
		},
		[
			createQueue.queueState.operation,
			createSession,
			startSession,
			restartSession,
			stopSession,
			logoutSession,
			updateInstance,
		],
	);

	// Display QR code dialog
	const displayQRDialog = useCallback(
		(instanceId: string, userWahaApiEndpoint?: string) => {
			const event = new CustomEvent("open-qr-dialog", {
				detail: { instanceId, userWahaApiEndpoint },
			});
			document.dispatchEvent(event);
		},
		[],
	);

	return {
		isLoading,
		queueState: {
			create: createQueue.queueState,
			start: startQueue.queueState,
			stop: stopQueue.queueState,
			logout: logoutQueue.queueState,
			restart: restartQueue.queueState,
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
