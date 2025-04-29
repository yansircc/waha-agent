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

	// 确保event字段存在且为字符串
	if (!body.event || typeof body.event !== "string") {
		return { isValid: false, errorMessage: "Missing or invalid event field" };
	}

	return { isValid: true };
}

/**
 * 检查是否为会话事件
 */
export function isSessionEvent(eventType: string): boolean {
	// List of session-related event types
	const sessionEvents = ["session.status"];
	return sessionEvents.includes(eventType);
}

/**
 * 检查是否为QR码相关事件
 */
export function isQRCodeEvent(body: WebhookNotification): boolean {
	// Session状态是扫描QR码
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
 * 检查是否为消息事件
 */
export function isMessageEvent(body: WebhookNotification): {
	isMessage: boolean;
	reason?: string;
} {
	// 确保event字段存在
	if (!body.event || typeof body.event !== "string") {
		return { isMessage: false, reason: "Missing or invalid event field" };
	}

	// 不是消息类型事件
	if (!body.event.startsWith("message")) {
		return { isMessage: false, reason: "Not message event" };
	}

	// 没有payload
	if (!body.payload) {
		return { isMessage: false, reason: "No message payload" };
	}

	return { isMessage: true };
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

	// 确保消息有有效的来源ID
	if (!messageData.from) {
		return { isValid: false, errorMessage: "Message missing 'from' field" };
	}

	const chatId = messageData.from;
	return { isValid: true, chatId };
}

/**
 * 检查是否为自己发给自己的消息
 */
export function isSelfToSelfMessage(messageData: Partial<WAMessage>): boolean {
	// 如果fromMe为true且from和to是同一个, 那么是自己发给自己的消息
	if (
		messageData.fromMe === true &&
		messageData.from &&
		messageData.to &&
		messageData.from === messageData.to
	) {
		return true;
	}
	return false;
}
