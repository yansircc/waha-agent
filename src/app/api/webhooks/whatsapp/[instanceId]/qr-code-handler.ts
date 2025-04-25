import { wahaApi } from "@/server/api/waha-api";
import { db } from "@/server/db";
import { instances } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * 获取会话QR码并更新实例
 */
export async function fetchAndUpdateQRCode(
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
		await db
			.update(instances)
			.set({
				qrCode: qrData.data,
				status: "disconnected", // 设置状态为断开连接，因为需要扫描QR码
				updatedAt: new Date(),
			})
			.where(eq(instances.id, instanceId));

		console.log(`[${instanceId}] QR码已更新到数据库`);
		return qrData.data as string;
	} catch (error) {
		console.error(`[${instanceId}] 获取或更新QR码失败:`, error);
		return null;
	}
}

/**
 * 触发QR码对话框显示
 *
 * 发送自定义事件通知前端显示QR码对话框
 */
export function triggerQRCodeDisplay(instanceId: string): void {
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
 *
 * 当收到QR码相关事件时，自动获取最新的QR码并更新实例
 */
export async function handleQRCodeEvent(
	instanceId: string,
	sessionName: string,
): Promise<void> {
	console.log(`[${instanceId}] 处理QR码事件, 会话: ${sessionName}`);

	// 获取并更新QR码
	await fetchAndUpdateQRCode(instanceId, sessionName);
}
