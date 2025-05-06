import { setChatAgentActive } from "@/lib/instance-redis";
import type { WAMessage } from "@/types/api-responses";

/**
 * 处理自己发送的消息
 * 主要用于控制AI回复功能的开关
 */
export async function handleSelfMessage(
	instanceId: string,
	messageData: Partial<WAMessage>,
): Promise<{ success: boolean; action?: string; chatId?: string }> {
	// 获取消息内容
	const messageContent = messageData.body || "";
	if (!messageContent) {
		return { success: true };
	}

	// 获取对话方ID (当fromMe为true时，to字段包含对话方ID)
	const recipientId = messageData.to || "";
	if (!recipientId) {
		console.log("无法获取对话方ID，跳过控制设置");
		return { success: true };
	}

	// 检查消息是否以特定字符结尾，用于控制AI回复状态
	if (messageContent.endsWith(",")) {
		// 逗号结尾，禁用当前聊天的AI回复
		await setChatAgentActive(instanceId, recipientId, false);
		console.log(`已禁用与 ${recipientId} 的聊天AI回复`);
		return {
			success: true,
			action: "ai_disabled",
			chatId: recipientId,
		};
	}

	if (messageContent.endsWith(".")) {
		// 句号结尾，启用当前聊天的AI回复
		await setChatAgentActive(instanceId, recipientId, true);
		console.log(`已启用与 ${recipientId} 的聊天AI回复`);
		return {
			success: true,
			action: "ai_enabled",
			chatId: recipientId,
		};
	}

	// 其他自己发送的消息，不做处理
	return { success: true };
}
