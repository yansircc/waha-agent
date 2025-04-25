"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useInstances } from "./use-instances";
import { useWahaAuth } from "./use-waha-auth";

interface UseQRCodeOptions {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
	pollingInterval?: number; // 毫秒
	maxAttempts?: number;
}

export function useQRCode({
	onSuccess,
	onError,
	pollingInterval = 5000, // 默认5秒
	maxAttempts = 12, // 默认最多尝试12次（约1分钟）
}: UseQRCodeOptions = {}) {
	const { updateInstance } = useInstances();
	const { fetchQRCode } = useWahaAuth();
	const qrRequestsInProgress = useRef<Record<string, boolean>>({});
	const [pollingInstances, setPollingInstances] = useState<
		Record<string, boolean>
	>({});
	const pollingAttempts = useRef<Record<string, number>>({});
	const pollingTimers = useRef<Record<string, NodeJS.Timeout>>({});

	// Get QR code for the instance with debouncing
	const getInstanceQR = useCallback(
		async (instanceId: string, sessionName: string) => {
			// Check if a QR request is already in progress for this instance
			const requestKey = `${instanceId}:${sessionName}`;
			if (qrRequestsInProgress.current[requestKey]) {
				console.log(`QR码请求已经在进行中 - ${sessionName}`);
				return null;
			}

			// Mark this request as in progress
			qrRequestsInProgress.current[requestKey] = true;

			try {
				const qrData = await fetchQRCode(sessionName, "image");

				// Handle the case where fetchQRCode returns null
				if (!qrData) {
					console.log("QR码获取返回null，会话:", sessionName);
					qrRequestsInProgress.current[requestKey] = false;
					return null;
				}

				if (qrData && typeof qrData === "object" && "data" in qrData) {
					// Update the instance with the QR code
					await updateInstance({
						id: instanceId,
						qrCode: qrData.data,
					});

					onSuccess?.();
					qrRequestsInProgress.current[requestKey] = false;
					return qrData.data;
				}

				// If we get here, the QR code isn't available yet
				console.log("QR码尚未可用，会话:", sessionName);
				qrRequestsInProgress.current[requestKey] = false;
				return null;
			} catch (error) {
				const err = error as Error;
				console.error(`获取QR码出错: ${err.message}`);
				onError?.(err);
				qrRequestsInProgress.current[requestKey] = false;
				return null;
			}
		},
		[fetchQRCode, updateInstance, onSuccess, onError],
	);

	// Function to display QR code in UI
	const displayQRCode = useCallback((instanceId: string) => {
		const event = new CustomEvent("open-qr-dialog", {
			detail: { instanceId },
		});
		document.dispatchEvent(event);
	}, []);

	// 清理特定实例的轮询
	const clearPollingForInstance = useCallback((instanceId: string) => {
		if (pollingTimers.current[instanceId]) {
			clearTimeout(pollingTimers.current[instanceId]);
			delete pollingTimers.current[instanceId];
			delete pollingAttempts.current[instanceId];

			setPollingInstances((prev) => {
				const newState = { ...prev };
				delete newState[instanceId];
				return newState;
			});

			console.log(`已停止为实例 ${instanceId} 轮询QR码`);
		}
	}, []);

	// 清理所有轮询
	const clearAllPolling = useCallback(() => {
		for (const instanceId of Object.keys(pollingTimers.current)) {
			clearTimeout(pollingTimers.current[instanceId]);
		}
		pollingTimers.current = {};
		pollingAttempts.current = {};
		setPollingInstances({});
		console.log("已停止所有QR码轮询");
	}, []);

	// 启动轮询
	const startPolling = useCallback(
		(instanceId: string, sessionName: string) => {
			// 如果已经在轮询，就不要重新开始
			if (pollingInstances[instanceId]) {
				return;
			}

			console.log(`开始为实例 ${instanceId} 轮询QR码`);

			// 标记为正在轮询
			setPollingInstances((prev) => ({ ...prev, [instanceId]: true }));

			// 初始化尝试次数
			pollingAttempts.current[instanceId] = 0;

			// 定义轮询函数
			const poll = async () => {
				try {
					// 增加尝试次数
					pollingAttempts.current[instanceId] =
						(pollingAttempts.current[instanceId] || 0) + 1;

					console.log(
						`QR码轮询 - 实例 ${instanceId} - 尝试 ${pollingAttempts.current[instanceId]}/${maxAttempts}`,
					);

					// 获取QR码
					const qrData = await getInstanceQR(instanceId, sessionName);

					// 如果获取到QR码，停止轮询
					if (qrData) {
						console.log(`已获取到实例 ${instanceId} 的QR码，停止轮询`);
						clearPollingForInstance(instanceId);

						// 显示QR码对话框
						displayQRCode(instanceId);

						return;
					}

					// 如果达到最大尝试次数，停止轮询
					if (pollingAttempts.current[instanceId] >= maxAttempts) {
						console.log(
							`实例 ${instanceId} 的QR码轮询达到最大尝试次数 ${maxAttempts}，停止轮询`,
						);
						clearPollingForInstance(instanceId);

						toast.error(`无法获取QR码，请手动点击"刷新"按钮重试`);
						return;
					}

					// 继续轮询
					pollingTimers.current[instanceId] = setTimeout(poll, pollingInterval);
				} catch (error) {
					console.error(`QR码轮询错误 - 实例 ${instanceId}:`, error);

					// 继续轮询，除非达到最大尝试次数
					if (
						pollingAttempts.current[instanceId] !== undefined &&
						pollingAttempts.current[instanceId] >= maxAttempts
					) {
						console.log(
							`实例 ${instanceId} 的QR码轮询出错且达到最大尝试次数，停止轮询`,
						);
						clearPollingForInstance(instanceId);

						toast.error(`获取QR码时出错，请手动点击"刷新"按钮重试`);
					} else {
						pollingTimers.current[instanceId] = setTimeout(
							poll,
							pollingInterval,
						);
					}
				}
			};

			// 开始第一次轮询
			poll();
		},
		[
			pollingInstances,
			maxAttempts,
			pollingInterval,
			clearPollingForInstance,
			getInstanceQR,
			displayQRCode,
		],
	);

	// 清理函数
	useEffect(() => {
		return () => {
			// 组件卸载时清理所有轮询
			clearAllPolling();
		};
	}, [clearAllPolling]);

	return {
		getInstanceQR,
		displayQRCode,
		startPollingQRCode: startPolling,
		stopPollingQRCode: clearPollingForInstance,
		stopAllPolling: clearAllPolling,
		isPolling: pollingInstances,
	};
}
