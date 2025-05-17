"use client";

import { useAgents } from "@/app/agents/hooks/use-agents";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useInstances } from "./use-instances";
import { useWhatsAppSession } from "./use-whatsapp-session";

export function useInstanceManager() {
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [selectedAgentId, setSelectedAgentId] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [userWebhooks, setUserWebhooks] = useState<string[]>([]);

	// Core hooks
	const { instances, isLoadingInstances, createInstance, deleteInstance } =
		useInstances();
	const { agents, isLoadingAgents } = useAgents();
	const {
		createSession,
		startSession,
		stopSession,
		logoutSession,
		restartSession,
		retrySession,
		displayQRDialog,
		isLoading: isSessionLoading,
		queueState,
	} = useWhatsAppSession();

	// Handle dialog open/close
	const handleOpenAddDialog = useCallback(() => setIsAddOpen(true), []);
	const handleCloseAddDialog = useCallback(() => {
		setIsAddOpen(false);
		setSelectedAgentId("");
		setUserWebhooks([]);
	}, []);

	// Create a new instance and WhatsApp session
	const handleSubmit = useCallback(
		async (agentId: string, webhooks?: string[]) => {
			if (!agentId) {
				toast.error("请选择一个AI机器人");
				return;
			}

			setIsLoading(true);
			try {
				// 查找选中的机器人名称作为实例名称
				const selectedAgent = agents.find((agent) => agent.id === agentId);
				const agentName = selectedAgent?.name || "WhatsApp 账号";

				// First create the instance in our database
				const newInstance = await createInstance({
					name: agentName,
					agentId: agentId,
					userWebhooks: webhooks?.filter((url) => url.trim() !== ""),
				});

				if (!newInstance?.id) {
					throw new Error("Failed to create instance");
				}

				// Then create a WhatsApp session with webhook configuration
				const result = await createSession(newInstance.id);

				// 创建会话成功后处理UI状态
				if (result) {
					// 如果在队列中，保持对话框打开，展示队列状态
					if (queueState.create.status === "queued") {
						toast.success("WhatsApp账号已创建并加入队列");
					}
					// 如果直接完成或活跃中，关闭对话框，显示QR码扫描
					else {
						handleCloseAddDialog();
						// 显示QR码扫描对话框
						displayQRDialog(newInstance.id);
						toast.success("WhatsApp账号已创建");
					}
				}
			} catch (error) {
				toast.error(`创建账号时出错: ${(error as Error).message}`);
			} finally {
				setIsLoading(false);
			}
		},
		[
			createInstance,
			createSession,
			handleCloseAddDialog,
			displayQRDialog,
			agents,
			queueState.create.status,
		],
	);

	// Delete instance
	const handleDeleteInstance = useCallback(
		async (id: string) => {
			if (!window.confirm("确定要删除这个账号吗？")) return;

			setIsLoading(true);
			try {
				await deleteInstance(id);
				toast.success("账号已删除");
			} catch (error) {
				toast.error(`删除账号时出错: ${(error as Error).message}`);
			} finally {
				setIsLoading(false);
			}
		},
		[deleteInstance],
	);

	// Handle QR code scan (display QR dialog)
	const handleScanQR = useCallback(
		(instance: (typeof instances)[0]) => {
			displayQRDialog(instance.id);
		},
		[displayQRDialog],
	);

	// Start WhatsApp session
	const handleStartSession = useCallback(
		async (instance: (typeof instances)[0]) => {
			setIsLoading(true);
			try {
				await startSession(instance.id);
				toast.success(`正在启动 ${instance.name}`);
			} catch (error) {
				toast.error(`启动会话时出错: ${(error as Error).message}`);
			} finally {
				setIsLoading(false);
			}
		},
		[startSession],
	);

	// Stop WhatsApp session
	const handleStopSession = useCallback(
		async (instance: (typeof instances)[0]) => {
			setIsLoading(true);
			try {
				await stopSession(instance.id);
				toast.success(`已停止 ${instance.name}`);
			} catch (error) {
				toast.error(`停止会话时出错: ${(error as Error).message}`);
			} finally {
				setIsLoading(false);
			}
		},
		[stopSession],
	);

	// Logout from WhatsApp session
	const handleLogoutSession = useCallback(
		async (instance: (typeof instances)[0]) => {
			if (!window.confirm("确定要退出账号吗？你将需要重新扫描QR码登录。"))
				return;

			setIsLoading(true);
			try {
				await logoutSession(instance.id);
				toast.success(`已退出登录 ${instance.name}`);
			} catch (error) {
				toast.error(`退出登录时出错: ${(error as Error).message}`);
			} finally {
				setIsLoading(false);
			}
		},
		[logoutSession],
	);

	// Restart session
	const handleRefreshSession = useCallback(
		async (instance: (typeof instances)[0]) => {
			setIsLoading(true);
			try {
				await restartSession(instance.id);
				toast.success(`正在刷新 ${instance.name}`);
			} catch (error) {
				toast.error(`刷新会话时出错: ${(error as Error).message}`);
			} finally {
				setIsLoading(false);
			}
		},
		[restartSession],
	);

	// Retry session creation (useful after timeout)
	const handleRetrySession = useCallback(
		async (instance: (typeof instances)[0]) => {
			setIsLoading(true);
			try {
				await retrySession(instance.id);
			} catch (error) {
				toast.error(`重试创建会话时出错: ${(error as Error).message}`);
			} finally {
				setIsLoading(false);
			}
		},
		[retrySession],
	);

	return {
		// State
		isAddOpen,
		setIsAddOpen,
		selectedAgentId,
		setSelectedAgentId,
		instances,
		isLoadingInstances,
		agents,
		isLoadingAgents,
		isApiLoading: isLoading || isSessionLoading,

		// Actions
		handleOpenAddDialog,
		handleCloseAddDialog,
		handleSubmit,
		handleDeleteInstance,
		handleScanQR,
		handleStartSession,
		handleStopSession,
		handleLogoutSession,
		handleRefreshSession,
		handleRetrySession,

		// Queue related state
		queuePosition: queueState.create.queuePosition,
		estimatedWaitTime: queueState.create.estimatedWaitTime,
		isQueued: queueState.create.status === "queued",
		isTimeout: queueState.create.status === "timeout",
		waitingCount: queueState.create.waitingCount,
		activeCount: queueState.create.activeCount,
		errorMessage: queueState.create.errorMessage,
		currentJobId: queueState.create.currentJob?.id,

		// New webhook state and function
		userWebhooks,
		setUserWebhooks,
	};
}
