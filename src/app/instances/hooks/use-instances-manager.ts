"use client";

import { useAgents } from "@/app/agents/hooks/use-agents";
import { sanitizeSessionName } from "@/utils/session-utils";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useInstances } from "./use-instances";
import { useInstancesApi } from "./use-instances-api";
import { useQRCode } from "./use-qr-code";
import { useSessionStatus } from "./use-session-status";
import { useWahaSessions } from "./use-waha-sessions";

// Core functionality hook
export function useInstancesManager() {
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [instanceName, setInstanceName] = useState("");
	const [selectedAgentId, setSelectedAgentId] = useState("");
	const [newInstanceId, setNewInstanceId] = useState<string | null>(null);
	const [showQRAfterCreate, setShowQRAfterCreate] = useState(false);
	// Track active operations by instance ID to prevent duplicates
	const pendingOperations = useRef<Record<string, boolean>>({});

	const {
		instances,
		isLoadingInstances,
		createInstance,
		deleteInstance,
		updateInstance,
	} = useInstances();

	const { agents, isLoadingAgents } = useAgents();

	const { fetchSessionByName, sessions, isLoadingSessions } = useWahaSessions();
	const { displayQRCode, startPollingQRCode, stopPollingQRCode } = useQRCode();
	const { checkSessionStatus } = useSessionStatus();

	const {
		isLoading: isApiLoading,
		createInstanceSession,
		getInstanceQR,
		startInstanceSession,
		stopInstanceSession,
		logoutInstanceSession,
		refreshInstanceSession,
	} = useInstancesApi({
		onError: (error) => {
			toast.error(`API错误: ${error.message}`);
		},
	});

	// Open QR dialog for new instance
	useEffect(() => {
		if (showQRAfterCreate && newInstanceId) {
			const instance = instances.find((i) => i.id === newInstanceId);
			if (instance) {
				handleScanQR(instance);
				setShowQRAfterCreate(false);
				setNewInstanceId(null);
			}
		}
	}, [instances, newInstanceId, showQRAfterCreate]);

	// Check instances status on component load - only once
	const initialStatusChecked = useRef(false);
	useEffect(() => {
		if (
			!isLoadingInstances &&
			instances.length > 0 &&
			!initialStatusChecked.current
		) {
			initialStatusChecked.current = true;

			for (const instance of instances) {
				const sanitizedName = sanitizeSessionName(instance.name);

				if (instance.status === "disconnected") {
					// 如果已断开连接，先尝试自动获取QR码
					startPollingQRCode(instance.id, sanitizedName);
				} else if (instance.status === "connecting") {
					startInstanceSession(instance.id, sanitizedName).catch((error) => {
						console.error(`启动会话时出错: ${instance.name}:`, error);
					});
				}
			}
		}
	}, [isLoadingInstances, instances, startInstanceSession, startPollingQRCode]);

	const handleOpenAddDialog = () => setIsAddOpen(true);

	const handleCloseAddDialog = () => {
		setIsAddOpen(false);
		resetForm();
	};

	const resetForm = () => {
		setInstanceName("");
		setSelectedAgentId("");
	};

	const handleSubmit = async (name: string, agentId: string) => {
		try {
			// Create the instance in our database first
			const newInstance = await createInstance({
				name,
				agentId: agentId || undefined,
			});

			// Then create a WhatsApp session for it
			if (newInstance?.id) {
				await createInstanceSession(newInstance.id, newInstance.name);

				// 设置轮询获取QR码
				const sanitizedName = sanitizeSessionName(newInstance.name);
				startPollingQRCode(newInstance.id, sanitizedName);

				// Close dialog and show QR code immediately
				setNewInstanceId(newInstance.id);
				setShowQRAfterCreate(true);
				handleCloseAddDialog();
			}
		} catch (error) {
			toast.error(`创建账号时出错: ${(error as Error).message}`);
		}
	};

	const handleDeleteInstance = async (id: string) => {
		if (window.confirm("确定要删除这个账号吗？")) {
			// 停止任何正在进行的QR码轮询
			stopPollingQRCode(id);
			await deleteInstance(id);
		}
	};

	const handleScanQR = (instance: (typeof instances)[0]) => {
		// 如果正在轮询，先停止轮询
		if (pendingOperations.current[instance.id]) {
			console.log(`操作已在进行中 - 账号: ${instance.name}`);
			return;
		}

		// 不再立即获取QR码，而是启动轮询
		// 这将更可靠地获取QR码，尤其是在QR码可能不立即可用的情况下
		pendingOperations.current[instance.id] = true;

		const sanitizedName = sanitizeSessionName(instance.name);

		// 开始轮询
		startPollingQRCode(instance.id, sanitizedName);

		// 立即显示QR码对话框，即使QR码可能还未准备好
		displayQRCode(instance.id);

		// 设置一个延迟，以便在QR码轮询完成后清除标志
		setTimeout(() => {
			pendingOperations.current[instance.id] = false;
		}, 2000);
	};

	// Instance QR code fetching
	const fetchInstanceQR = async (instanceId: string, sessionName: string) => {
		// Don't proceed if there's a pending operation
		if (pendingOperations.current[instanceId]) {
			console.log(`操作已在进行中 - 账号ID: ${instanceId}`);
			return;
		}

		// Mark operation as in progress
		pendingOperations.current[instanceId] = true;

		try {
			// Normalize session name
			const finalSessionName = sanitizeSessionName(sessionName);

			// Get session status
			const session = await fetchSessionByName(finalSessionName);
			const instance = instances.find((i) => i.id === instanceId);

			if (!instance) {
				pendingOperations.current[instanceId] = false;
				return;
			}

			// If session needs QR code, get it
			if (session && session.status === "SCAN_QR_CODE") {
				// 使用轮询获取QR码而不是单次获取
				startPollingQRCode(instanceId, finalSessionName);

				// Display QR code
				displayQRCode(instanceId);
			} else if (
				session &&
				(session.status === "RUNNING" || session.status === "WORKING")
			) {
				// If connected, update status
				await updateInstance({
					id: instanceId,
					status: "connected",
				});
				toast.success(`WhatsApp账号 ${sessionName} 已连接`);
			}
		} catch (error) {
			console.error("获取二维码时出错:", error);
			toast.error("获取二维码失败。请再试一次。");
		} finally {
			// Clear operation flag
			pendingOperations.current[instanceId] = false;
		}
	};

	const handleStartSession = async (instance: (typeof instances)[0]) => {
		// Don't proceed if there's a pending operation
		if (pendingOperations.current[instance.id]) {
			console.log(`操作已在进行中 - 账号: ${instance.name}`);
			return;
		}

		// Mark operation as in progress
		pendingOperations.current[instance.id] = true;

		try {
			const sanitizedName = sanitizeSessionName(instance.name);
			await startInstanceSession(instance.id, sanitizedName);
			toast.success(`WhatsApp账号 ${instance.name} 已启动`);
		} catch (error) {
			toast.error(`启动会话时出错: ${(error as Error).message}`);
		} finally {
			// Clear operation flag
			pendingOperations.current[instance.id] = false;
		}
	};

	const handleStopSession = async (instance: (typeof instances)[0]) => {
		// Don't proceed if there's a pending operation
		if (pendingOperations.current[instance.id]) {
			return;
		}

		// Mark operation as in progress
		pendingOperations.current[instance.id] = true;

		try {
			const sanitizedName = sanitizeSessionName(instance.name);
			await stopInstanceSession(instance.id, sanitizedName);
			toast.success(`WhatsApp账号 ${instance.name} 已停止`);
		} catch (error) {
			toast.error(`停止会话时出错: ${(error as Error).message}`);
		} finally {
			// Clear operation flag
			pendingOperations.current[instance.id] = false;
		}
	};

	const handleLogoutSession = async (instance: (typeof instances)[0]) => {
		if (window.confirm("确定要登出吗？你需要再次扫描二维码来重新连接。")) {
			// Don't proceed if there's a pending operation
			if (pendingOperations.current[instance.id]) {
				return;
			}

			// Mark operation as in progress
			pendingOperations.current[instance.id] = true;

			try {
				const sanitizedName = sanitizeSessionName(instance.name);
				await logoutInstanceSession(instance.id, sanitizedName);
				toast.success(`WhatsApp账号 ${instance.name} 已登出`);
			} catch (error) {
				toast.error(`登出时出错: ${(error as Error).message}`);
			} finally {
				// Clear operation flag
				pendingOperations.current[instance.id] = false;
			}
		}
	};

	const handleRefreshSession = async (instance: (typeof instances)[0]) => {
		// Don't proceed if there's a pending operation
		if (pendingOperations.current[instance.id]) {
			return;
		}

		// Mark operation as in progress
		pendingOperations.current[instance.id] = true;

		try {
			const sanitizedName = sanitizeSessionName(instance.name);

			// First check session status
			const session = await fetchSessionByName(sanitizedName);

			// Decide next action based on session status
			if (session) {
				// Determine instance status and update it
				const status = await checkSessionStatus(instance.id, sanitizedName);

				if (session.status === "SCAN_QR_CODE") {
					// 使用轮询获取QR码
					startPollingQRCode(instance.id, sanitizedName);
					displayQRCode(instance.id);
					toast.success(`QR码已刷新 - ${instance.name}`);
					return;
				}

				toast.success(
					`Status refreshed for ${instance.name}: ${status || "unknown"}`,
				);
			} else {
				// If session doesn't exist, try to restart
				await refreshInstanceSession(instance.id, sanitizedName);
				toast.success(`WhatsApp账号 ${instance.name} 已刷新`);
			}
		} catch (error) {
			toast.error(`刷新会话时出错: ${(error as Error).message}`);
		} finally {
			// Clear operation flag
			pendingOperations.current[instance.id] = false;
		}
	};

	return {
		isAddOpen,
		setIsAddOpen,
		instanceName,
		setInstanceName,
		selectedAgentId,
		setSelectedAgentId,
		instances,
		isLoadingInstances,
		isApiLoading,
		agents,
		isLoadingAgents,
		handleOpenAddDialog,
		handleCloseAddDialog,
		handleSubmit,
		handleDeleteInstance,
		handleScanQR,
		handleStartSession,
		handleStopSession,
		handleLogoutSession,
		handleRefreshSession,
	};
}
