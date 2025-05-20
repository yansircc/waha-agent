import { createInstanceApiClient } from "@/lib/waha-api";
import { db } from "@/server/db";
import { instances } from "@/server/db/schema";
import type { WebhookNotification } from "@/types/waha";
import { eq } from "drizzle-orm";
import { trackQRScan } from "./session-qr-tracker";

/**
 * Extracts QR code data from webhook payload when available
 */
function extractQRCodeFromPayload(body: WebhookNotification): string | null {
	if (body.event === "qr" && body.payload && typeof body.payload === "object") {
		// Handle direct QR code data if available in payload
		if ("qr" in body.payload && typeof body.payload.qr === "string") {
			return body.payload.qr;
		}
	}

	return null;
}

/**
 * 获取会话QR码并更新实例
 */
async function fetchAndUpdateQRCode(
	instanceId: string,
	sessionName: string,
	userWahaApiEndpoint?: string,
	userWahaApiKey?: string,
): Promise<string | null> {
	try {
		// 获取QR码数据
		const apiClient = createInstanceApiClient(
			userWahaApiEndpoint,
			userWahaApiKey,
		);
		const qrData = await apiClient.auth.getQRCode(sessionName, "image");

		if (!qrData || typeof qrData !== "object" || !("data" in qrData)) {
			console.log(`[${instanceId}] QR码尚未准备好或无效`);
			return null;
		}

		// 更新数据库中的实例QR码
		await updateInstanceQRCode(instanceId, qrData.data as string);
		return qrData.data as string;
	} catch (error) {
		console.error(`[${instanceId}] 获取或更新QR码失败:`, error);
		return null;
	}
}

/**
 * Updates instance record with QR code
 */
async function updateInstanceQRCode(
	instanceId: string,
	qrCode: string,
): Promise<void> {
	try {
		await db
			.update(instances)
			.set({
				qrCode,
				status: "disconnected", // 设置状态为断开连接，因为需要扫描QR码
				updatedAt: new Date(),
			})
			.where(eq(instances.id, instanceId));

		console.log(`[${instanceId}] QR码已更新到数据库`);
	} catch (error) {
		console.error(`[${instanceId}] 更新QR码失败:`, error);
	}
}

/**
 * 处理会话中的QR码事件
 */
export async function handleQRCodeEvent(
	instanceId: string,
	sessionName: string,
	userWahaApiEndpoint?: string,
	userWahaApiKey?: string,
	body?: WebhookNotification,
): Promise<void> {
	console.log(`[${instanceId}] 处理QR码事件, 会话: ${sessionName}`);

	// 记录QR码扫描事件并检查是否达到失败阈值
	const { scanCount, deleteTriggered } = await trackQRScan(
		instanceId,
		sessionName,
	);

	// 如果已触发删除操作，直接返回，不再处理QR码
	if (deleteTriggered) {
		console.log(
			`[${instanceId}] 已达到连续QR码扫描阈值(${scanCount})，已触发删除操作`,
		);
		return;
	}

	// 首先尝试从webhook载荷中提取QR码
	if (body) {
		const qrFromPayload = extractQRCodeFromPayload(body);
		if (qrFromPayload) {
			await updateInstanceQRCode(instanceId, qrFromPayload);
			return;
		}
	}

	// 如果载荷中没有QR码，则通过API获取
	await fetchAndUpdateQRCode(
		instanceId,
		sessionName,
		userWahaApiEndpoint,
		userWahaApiKey,
	);
}
