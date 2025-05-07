import {
	addMessageToChatHistory,
	chatHistoryExists,
	initializeChatHistory,
} from "@/lib/chat-history-redis";
import { getBotPhoneNumber, saveBotPhoneNumber } from "@/lib/instance-redis";
import { wahaApi } from "@/server/api/routers/waha-api";
import type { WAMessage } from "@/types/api-responses";
import { catchError } from "react-catch-error";

/**
 * 识别和保存机器人电话号码
 */
export async function identifyAndSaveBotPhoneNumber(
	instanceId: string,
	messageData: Partial<WAMessage>,
	session: string,
): Promise<string | null> {
	// 先尝试获取已存储的机器人号码
	const { error: getError, data: botPhoneNumber } = await catchError(async () =>
		getBotPhoneNumber(instanceId),
	);

	if (getError) {
		console.error("获取机器人电话号码失败:", getError);
	}

	// 如果已有号码，直接返回
	if (botPhoneNumber) {
		return botPhoneNumber;
	}

	// 从消息中确定号码的策略
	let detectedNumber: string | null = null;

	// 如果是机器人发送的消息，机器人号码是 from
	if (messageData.fromMe === true && messageData.from) {
		detectedNumber = messageData.from;
	}
	// 如果是用户发送的消息，机器人号码是 to
	else if (messageData.fromMe === false && messageData.to) {
		detectedNumber = messageData.to;
	}

	// 如果从消息中确定了号码，保存并返回
	if (detectedNumber) {
		const { error: saveError } = await catchError(async () =>
			saveBotPhoneNumber(instanceId, detectedNumber),
		);

		if (saveError) {
			console.error("保存机器人电话号码失败:", saveError);
		} else {
			console.log(`从消息中确定并保存机器人电话号码: ${detectedNumber}`);
		}

		return detectedNumber;
	}

	// 尝试从API获取机器人信息
	const { error: apiError, data: meInfo } = await catchError(async () =>
		wahaApi.sessions.getMeInfo(session),
	);

	if (apiError) {
		console.error("获取机器人信息失败:", apiError);
		return null;
	}

	if (meInfo?.phoneNumber) {
		const phoneNumber = meInfo.phoneNumber;

		// 保存API返回的电话号码
		const { error: saveError } = await catchError(async () =>
			saveBotPhoneNumber(instanceId, phoneNumber),
		);

		if (saveError) {
			console.error("保存机器人电话号码失败:", saveError);
		} else {
			console.log(`从API获取并保存机器人电话号码: ${phoneNumber}`);
		}

		return phoneNumber;
	}

	return null;
}

/**
 * 将消息添加到聊天历史记录中
 */
export async function handleChatHistory(
	instanceId: string,
	session: string,
	messageData: Partial<WAMessage>,
	otherPartyId: string,
): Promise<void> {
	if (!messageData.id || !messageData.timestamp || !otherPartyId) {
		console.log("消息缺少必要信息，无法添加到聊天历史");
		return;
	}

	// 以对方ID为键存储聊天记录
	const historyKey = otherPartyId;

	// 首先检查这个聊天的历史是否已经存在于Redis中
	const { error: existsError, data: historyExists } = await catchError(
		async () => chatHistoryExists(instanceId, historyKey),
	);

	if (existsError) {
		console.error("检查聊天历史记录存在性失败:", existsError);
		return;
	}

	// 如果历史记录不存在，尝试从WhatsApp API初始化
	if (!historyExists) {
		console.log(`没有找到聊天 ${historyKey} 的历史记录，正在从API初始化...`);

		const { error: initError } = await catchError(async () =>
			initializeChatHistory(instanceId, session, historyKey),
		);

		if (initError) {
			console.error("初始化聊天历史记录失败:", initError);
			// 失败后仍继续添加当前消息，确保至少记录新消息
		}
	}

	// 添加当前消息到历史记录
	const { error: addError } = await catchError(async () =>
		addMessageToChatHistory(instanceId, historyKey, messageData as WAMessage),
	);

	if (addError) {
		console.error("添加消息到聊天历史记录失败:", addError);
	}
}

/**
 * 确定与用户对话的另一方ID
 */
export function determineOtherPartyId(
	messageData: Partial<WAMessage>,
): string | undefined {
	// 如果消息是自己发的 (fromMe=true)，则另一方是接收者 (to)
	// 如果消息是别人发的 (fromMe=false)，则另一方是发送者 (from)
	return messageData.fromMe ? messageData.to : messageData.from;
}
