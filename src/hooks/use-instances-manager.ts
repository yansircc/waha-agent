"use client";

import { useAgents } from "@/app/agents/hooks/use-agents";
import { useInstances } from "@/hooks/use-instances";
import { useInstancesApi } from "@/hooks/use-instances-api";
import { useQRCode } from "@/hooks/use-qr-code";
import { useSessionStatus } from "@/hooks/use-session-status";
import { useWahaSessions } from "@/hooks/use-waha-sessions";
import { sanitizeSessionName } from "@/utils/session-utils";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
			toast.error(`API Error: ${error.message}`);
		},
	});

	const { fetchSessionByName, sessions, isLoadingSessions } = useWahaSessions();
	const { displayQRCode } = useQRCode();
	const { checkSessionStatus } = useSessionStatus();

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
					getInstanceQR(instance.id, sanitizedName);
				} else if (instance.status === "connecting") {
					startInstanceSession(instance.id, sanitizedName).catch((error) => {
						console.error(
							`Error starting session for ${instance.name}:`,
							error,
						);
					});
				}
			}
		}
	}, [isLoadingInstances, instances, startInstanceSession, getInstanceQR]);

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

				// Get QR code immediately
				await getInstanceQR(newInstance.id, newInstance.name);

				// Close dialog and show QR code immediately
				setNewInstanceId(newInstance.id);
				setShowQRAfterCreate(true);
				handleCloseAddDialog();
			}
		} catch (error) {
			toast.error(`Failed to create instance: ${(error as Error).message}`);
		}
	};

	const handleDeleteInstance = async (id: string) => {
		if (window.confirm("Are you sure you want to delete this instance?")) {
			await deleteInstance(id);
		}
	};

	const handleScanQR = (instance: (typeof instances)[0]) => {
		// Don't proceed if there's a pending operation
		if (pendingOperations.current[instance.id]) {
			console.log(
				`Operation already in progress for instance: ${instance.name}`,
			);
			return;
		}

		// Make sure we have a QR code available
		if (!instance.qrCode) {
			// Mark operation as in progress
			pendingOperations.current[instance.id] = true;

			getInstanceQR(instance.id, instance.name).finally(() => {
				// Clear operation flag
				pendingOperations.current[instance.id] = false;
			});
		}

		// Display QR code dialog
		displayQRCode(instance.id);
	};

	// Instance QR code fetching
	const fetchInstanceQR = async (instanceId: string, sessionName: string) => {
		// Don't proceed if there's a pending operation
		if (pendingOperations.current[instanceId]) {
			console.log(
				`Operation already in progress for instance ID: ${instanceId}`,
			);
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
				await getInstanceQR(instanceId, finalSessionName);

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
				toast.success(
					`WhatsApp session for ${sessionName} is already connected`,
				);
			}
		} catch (error) {
			console.error("Error fetching QR code:", error);
			toast.error("Failed to get QR code. Please try again.");
		} finally {
			// Clear operation flag
			pendingOperations.current[instanceId] = false;
		}
	};

	const handleStartSession = async (instance: (typeof instances)[0]) => {
		// Don't proceed if there's a pending operation
		if (pendingOperations.current[instance.id]) {
			console.log(
				`Operation already in progress for instance: ${instance.name}`,
			);
			return;
		}

		// Mark operation as in progress
		pendingOperations.current[instance.id] = true;

		try {
			const sanitizedName = sanitizeSessionName(instance.name);
			await startInstanceSession(instance.id, sanitizedName);
			toast.success(`Started WhatsApp session for ${instance.name}`);
		} catch (error) {
			toast.error(`Failed to start session: ${(error as Error).message}`);
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
			toast.success(`Stopped WhatsApp session for ${instance.name}`);
		} catch (error) {
			toast.error(`Failed to stop session: ${(error as Error).message}`);
		} finally {
			// Clear operation flag
			pendingOperations.current[instance.id] = false;
		}
	};

	const handleLogoutSession = async (instance: (typeof instances)[0]) => {
		if (
			window.confirm(
				"Are you sure you want to log out? You'll need to scan the QR code again to reconnect.",
			)
		) {
			// Don't proceed if there's a pending operation
			if (pendingOperations.current[instance.id]) {
				return;
			}

			// Mark operation as in progress
			pendingOperations.current[instance.id] = true;

			try {
				const sanitizedName = sanitizeSessionName(instance.name);
				await logoutInstanceSession(instance.id, sanitizedName);
				toast.success(`Logged out WhatsApp session for ${instance.name}`);
			} catch (error) {
				toast.error(`Failed to logout: ${(error as Error).message}`);
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
					// If QR code needed, get and display it
					await getInstanceQR(instance.id, sanitizedName);
					displayQRCode(instance.id);
					toast.success(`QR code refreshed for ${instance.name}`);
					return;
				}

				toast.success(
					`Status refreshed for ${instance.name}: ${status || "unknown"}`,
				);
			} else {
				// If session doesn't exist, try to restart
				await refreshInstanceSession(instance.id, sanitizedName);
				toast.success(`Refreshed WhatsApp session for ${instance.name}`);
			}
		} catch (error) {
			toast.error(`Failed to refresh session: ${(error as Error).message}`);
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
