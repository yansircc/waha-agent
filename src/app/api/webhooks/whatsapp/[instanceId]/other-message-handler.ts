import { getChatAgentActive, getInstanceAgent } from "@/lib/instance-redis";
import { wahaApi } from "@/server/api/routers/waha-api";
import { whatsAppChat } from "@/trigger/waha-chat";
import type { WAMessage, WebhookNotification } from "@/types/api-responses";
import { createWebhookUrl } from "./helpers";

/**
 * 处理他人发送的消息
 */
export async function handleOtherMessage(
	instanceId: string,
	session: string,
	messageData: Partial<WAMessage>,
	body: WebhookNotification,
	botPhoneNumber: string | null,
): Promise<{
	success: boolean;
	chatId?: string;
	message?: string;
	aiStatus?: string;
	error?: string;
}> {
	const chatId = messageData.from || "";

	try {
		// 获取消息内容
		const messageContent = messageData.body || "";

		if (!messageContent) {
			console.log("消息缺少必要字段，无法处理");
			return { success: true };
		}

		console.log(`收到来自 ${chatId} 的消息: ${messageContent}`);

		// 从Redis获取机器人配置
		const agentFromRedis = await getInstanceAgent(instanceId);

		// 检查此聊天是否启用了AI回复
		const isChatActive = await getChatAgentActive(instanceId, chatId);

		// 记录日志
		if (agentFromRedis) {
			if (isChatActive) {
				console.log(
					`与 ${chatId} 的聊天已启用AI回复，将使用机器人 ID: ${agentFromRedis.id}`,
				);
			} else {
				console.log(`与 ${chatId} 的聊天已禁用AI回复，跳过处理`);
				return {
					success: true,
					aiStatus: "inactive",
					chatId,
				};
			}
		} else {
			console.log(`账号 ${instanceId} 没有关联的机器人配置，将使用默认回复`);
		}

		// 创建webhook回调URL
		const webhookUrl = createWebhookUrl(instanceId);

		// 触发AI处理任务
		await whatsAppChat.trigger({
			session,
			webhookData: body,
			instanceId,
			webhookUrl,
			...(botPhoneNumber ? { botPhoneNumber } : {}),
			// 只在机器人存在且聊天已启用AI时提供
			agent: agentFromRedis && isChatActive ? agentFromRedis : undefined,
		});

		// 返回成功响应
		return {
			success: true,
			chatId,
			message: "已接收webhook，正在后台处理",
		};
	} catch (error) {
		// 记录错误但仍然返回成功响应
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`触发WhatsApp消息处理失败: ${errorMessage}`);

		// 如果触发失败，尝试手动处理消息以确保用户收到响应
		try {
			if (chatId) {
				await wahaApi.chatting.sendText({
					session,
					chatId,
					text: "很抱歉，我目前遇到了技术问题，请稍后再试。",
					linkPreview: false,
				});
			}
		} catch (innerError) {
			console.error("发送故障回复失败:", innerError);
		}

		// 仍然返回成功以告知WhatsApp已收到webhook
		return {
			success: true,
			chatId,
			error: "处理错误",
		};
	}
}
