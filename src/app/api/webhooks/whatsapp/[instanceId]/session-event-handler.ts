import { db } from "@/server/db";
import { instances } from "@/server/db/schema";
import type { InstanceStatus } from "@/types";
import type { WebhookNotification } from "@/types/api-responses";
import { eq } from "drizzle-orm";
import { handleQRCodeEvent } from "./qr-code-handler";
import { isQRCodeEvent } from "./utils";

/**
 * 根据 WAHA 会话状态映射到应用实例状态
 */
function mapSessionStatusToInstanceStatus(wahaStatus: string): InstanceStatus {
	switch (wahaStatus) {
		case "STARTING":
		case "SYNCING":
			return "connecting";
		case "WORKING":
		case "RUNNING":
			return "connected";
		case "SCAN_QR_CODE":
		case "STOPPED":
		case "ERROR":
			return "disconnected";
		default:
			return "disconnected";
	}
}

// 定义可能的Payload类型
type SessionStatusPayload = {
	status?: string;
	name?: string;
};

type ConnectionUpdatePayload = {
	connection?: string;
};

// 通用的Webhook Payload类型
type WebhookPayload =
	| SessionStatusPayload
	| ConnectionUpdatePayload
	| Record<string, unknown>;

/**
 * 处理会话相关的事件
 */
export async function handleSessionEvent(
	instanceId: string,
	body: WebhookNotification,
): Promise<{
	success: boolean;
	eventType: string;
	details?: WebhookPayload;
	instanceStatus?: InstanceStatus;
}> {
	// 提取事件类型
	const eventType = body.event || "unknown";
	const sessionName = body.session || "default";

	// 记录会话事件
	console.log(`[${instanceId}] 收到会话事件: ${eventType}`, {
		sessionName: body.session,
		payload: body.payload,
	});

	// 初始化实例状态变量
	let instanceStatus: InstanceStatus | undefined;

	// 检查是否为QR码相关事件
	if (isQRCodeEvent(body)) {
		console.log(`[${instanceId}] 检测到QR码相关事件，正在处理...`);
		// 调用QR码处理函数
		await handleQRCodeEvent(instanceId, sessionName);
		instanceStatus = "disconnected";
	}
	// 根据事件类型处理
	else if (
		eventType === "session.status" &&
		body.payload &&
		typeof body.payload === "object"
	) {
		const payload = body.payload as SessionStatusPayload;

		if (payload.status) {
			// 映射 WAHA 状态到实例状态
			instanceStatus = mapSessionStatusToInstanceStatus(payload.status);

			// 更新数据库中的实例状态
			try {
				await db
					.update(instances)
					.set({
						status: instanceStatus,
						updatedAt: new Date(),
					})
					.where(eq(instances.id, instanceId));

				console.log(
					`[${instanceId}] 已更新实例状态为: ${instanceStatus} (WAHA 状态: ${payload.status})`,
				);
			} catch (error) {
				console.error(`[${instanceId}] 更新实例状态失败:`, error);
			}
		}
	}

	// 处理连接事件
	else if (eventType === "connection.update") {
		const payload = body.payload as ConnectionUpdatePayload;

		if (payload?.connection === "open") {
			// 连接已建立
			try {
				await db
					.update(instances)
					.set({
						status: "connected",
						updatedAt: new Date(),
					})
					.where(eq(instances.id, instanceId));

				instanceStatus = "connected";
				console.log(`[${instanceId}] 已更新实例连接状态为: 已连接`);
			} catch (error) {
				console.error(`[${instanceId}] 更新连接状态失败:`, error);
			}
		} else if (payload?.connection === "close") {
			// 连接已关闭
			try {
				await db
					.update(instances)
					.set({
						status: "disconnected",
						updatedAt: new Date(),
					})
					.where(eq(instances.id, instanceId));

				instanceStatus = "disconnected";
				console.log(`[${instanceId}] 已更新实例连接状态为: 已断开`);
			} catch (error) {
				console.error(`[${instanceId}] 更新连接状态失败:`, error);
			}
		}
	}

	// 处理身份验证事件
	else if (eventType === "authenticated") {
		try {
			await db
				.update(instances)
				.set({
					status: "connected",
					updatedAt: new Date(),
				})
				.where(eq(instances.id, instanceId));

			instanceStatus = "connected";
			console.log(`[${instanceId}] 已更新实例认证状态为: 已连接`);
		} catch (error) {
			console.error(`[${instanceId}] 更新认证状态失败:`, error);
		}
	}

	// 处理准备就绪事件
	else if (eventType === "ready") {
		try {
			await db
				.update(instances)
				.set({
					status: "connected",
					updatedAt: new Date(),
				})
				.where(eq(instances.id, instanceId));

			instanceStatus = "connected";
			console.log(`[${instanceId}] 已更新实例状态为: 已连接 (ready)`);
		} catch (error) {
			console.error(`[${instanceId}] 更新就绪状态失败:`, error);
		}
	}

	return {
		success: true,
		eventType,
		details: body.payload as WebhookPayload,
		instanceStatus,
	};
}
