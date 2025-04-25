import type { WAMessage, WebhookNotification } from "@/types/api-responses";

/**
 * 验证webhook请求是否有效
 */
export function validateWebhook(body: WebhookNotification | null): {
	isValid: boolean;
	errorMessage?: string;
} {
	// 确保body有效，防止错误
	if (!body || typeof body !== "object") {
		return { isValid: false, errorMessage: "Invalid webhook data" };
	}

	return { isValid: true };
}

/**
 * 检查是否为消息类型的webhook
 */
export function isMessageEvent(body: WebhookNotification): {
	isMessage: boolean;
	reason?: string;
} {
	// 只处理消息类型的webhook
	if (!body.event || !body.event.startsWith("message")) {
		// 非消息事件或缺少event字段
		return {
			isMessage: false,
			reason: body.event ? "非消息事件" : "缺少event字段",
		};
	}

	return { isMessage: true };
}

/**
 * 检查是否为会话相关的事件
 */
export function isSessionEvent(body: WebhookNotification): boolean {
	if (!body.event) return false;

	// 会话相关事件前缀
	const sessionEventPrefixes = [
		"session",
		"connection",
		"qr",
		"ready",
		"authenticated",
	];

	// 检查事件是否以这些前缀开头
	return sessionEventPrefixes.some((prefix) => body.event?.startsWith(prefix));
}

/**
 * 检查是否为QR码相关事件
 */
export function isQRCodeEvent(body: WebhookNotification): boolean {
	// 检查是否为QR码事件
	if (body.event === "qr") return true;

	// 检查是否为需要QR码的会话状态更新事件
	if (
		body.event === "session.status" &&
		body.payload &&
		typeof body.payload === "object" &&
		"status" in body.payload &&
		body.payload.status === "SCAN_QR_CODE"
	) {
		return true;
	}

	return false;
}

/**
 * 验证消息数据是否有效
 */
export function validateMessageData(messageData: Partial<WAMessage> | null): {
	isValid: boolean;
	chatId?: string;
	errorMessage?: string;
} {
	if (!messageData) {
		return { isValid: false, errorMessage: "Empty message data" };
	}

	// 获取聊天ID
	const chatId = messageData.from || messageData.chatId || "";
	if (!chatId) {
		return { isValid: false, errorMessage: "Missing chatId" };
	}

	return { isValid: true, chatId };
}

/**
 * 检查是否为机器人自己发给自己的消息
 */
export function isSelfToSelfMessage(
	messageData: Partial<WAMessage>,
	botPhoneNumber: string | null,
): boolean {
	return !!(
		botPhoneNumber &&
		messageData.from === botPhoneNumber &&
		messageData.to === botPhoneNumber
	);
}
