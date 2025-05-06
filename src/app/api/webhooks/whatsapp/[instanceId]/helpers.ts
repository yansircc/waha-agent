import { env } from "@/env";
import {
	addMessageToChatHistory,
	chatHistoryExists,
	initializeChatHistory,
} from "@/lib/chat-history-redis";
import { getBotPhoneNumber, saveBotPhoneNumber } from "@/lib/instance-redis";
import { wahaApi } from "@/server/api/routers/waha-api";
import type { WAMessage } from "@/types/api-responses";

/**
 * 识别和保存机器人电话号码
 */
export async function identifyAndSaveBotPhoneNumber(
	instanceId: string,
	messageData: Partial<WAMessage>,
	session: string,
): Promise<string | null> {
	let botPhoneNumber = await getBotPhoneNumber(instanceId);

	// 如果尚未存储机器人号码，尝试从消息中确定
	if (!botPhoneNumber) {
		if (messageData.fromMe === true && messageData.from) {
			// 如果是机器人发送的消息，机器人号码是 from
			botPhoneNumber = messageData.from;
			await saveBotPhoneNumber(instanceId, botPhoneNumber);
			console.log(`从消息中确定并保存机器人电话号码: ${botPhoneNumber}`);
		} else if (messageData.fromMe === false && messageData.to) {
			// 如果是用户发送的消息，机器人号码是 to
			botPhoneNumber = messageData.to;
			await saveBotPhoneNumber(instanceId, botPhoneNumber);
			console.log(`从消息中确定并保存机器人电话号码: ${botPhoneNumber}`);
		} else {
			// 尝试从API获取机器人信息
			try {
				const meInfo = await wahaApi.sessions.getMeInfo(session);
				if (meInfo?.phoneNumber) {
					botPhoneNumber = meInfo.phoneNumber;
					await saveBotPhoneNumber(instanceId, botPhoneNumber);
					console.log(`从API获取并保存机器人电话号码: ${botPhoneNumber}`);
				}
			} catch (error) {
				console.error("获取机器人信息失败:", error);
			}
		}
	}

	return botPhoneNumber;
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
	if (messageData.id && messageData.timestamp && otherPartyId) {
		// 以对方ID为键存储聊天记录
		const historyKey = otherPartyId;

		// 首先检查这个聊天的历史是否已经存在于Redis中
		const historyExists = await chatHistoryExists(instanceId, historyKey);

		if (!historyExists) {
			// 如果历史记录不存在，尝试从WhatsApp API初始化
			console.log(`没有找到聊天 ${historyKey} 的历史记录，正在从API初始化...`);
			await initializeChatHistory(instanceId, session, historyKey);
		}

		// 添加当前消息到历史记录
		await addMessageToChatHistory(
			instanceId,
			historyKey,
			messageData as WAMessage,
		);
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
