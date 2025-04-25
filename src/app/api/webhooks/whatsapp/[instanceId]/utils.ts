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
