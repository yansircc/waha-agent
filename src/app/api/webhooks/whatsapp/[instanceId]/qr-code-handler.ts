import { wahaApi } from "@/server/api/routers/waha-api";
import { db } from "@/server/db";
import { instances } from "@/server/db/schema";
import type { WebhookNotification } from "@/types/api-responses";
import { eq } from "drizzle-orm";

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
): Promise<string | null> {
	try {
		// 获取QR码数据
		const qrData = await wahaApi.auth.getQRCode(sessionName, "image");

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
 * 触发QR码对话框显示
 *
 * 发送自定义事件通知前端显示QR码对话框
 */
function triggerQRCodeDisplay(instanceId: string): void {
	if (typeof document !== "undefined") {
		// 仅在浏览器环境中执行
		const event = new CustomEvent("open-qr-dialog", {
			detail: { instanceId },
		});
		document.dispatchEvent(event);
		console.log(`[${instanceId}] 已触发QR码对话框显示事件`);
	}
}

/**
 * 处理会话中的QR码事件
 */
export async function handleQRCodeEvent(
	instanceId: string,
	sessionName: string,
	body?: WebhookNotification,
): Promise<void> {
	console.log(`[${instanceId}] 处理QR码事件, 会话: ${sessionName}`);

	// 首先尝试从webhook载荷中提取QR码
	if (body) {
		const qrFromPayload = extractQRCodeFromPayload(body);
		if (qrFromPayload) {
			await updateInstanceQRCode(instanceId, qrFromPayload);
			return;
		}
	}

	// 如果载荷中没有QR码，则通过API获取
	await fetchAndUpdateQRCode(instanceId, sessionName);
}
