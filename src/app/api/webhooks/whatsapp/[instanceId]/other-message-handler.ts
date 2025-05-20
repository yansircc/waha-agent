import { getChatHistory } from "@/lib/chat-history-redis";
import { getChatAgentActive, getInstanceAgent } from "@/lib/instance-redis";
import { whatsAppChat } from "@/trigger/waha-chat";
import type { WAMessage, WebhookNotification } from "@/types/waha";
import { runs } from "@trigger.dev/sdk";
import { markAgentIdle } from "./agent-status";
import { convertToFormatMessages } from "./helpers";
import {
	checkQueueAfterCompletion,
	processQueuedMessages,
} from "./message-processor";
import { enqueueMessage } from "./message-queue";

/**
 * 处理他人发送的消息
 */
export async function handleOtherMessage(
	instanceId: string,
	sessionName: string,
	messageData: Partial<WAMessage>,
	body: WebhookNotification,
	botPhoneNumber: string | null,
	userWahaApiEndpoint?: string,
	userWahaApiKey?: string,
): Promise<void> {
	const chatId = messageData.from || "";

	try {
		// 获取消息内容
		const messageContent = messageData.body || "";

		if (!messageContent) {
			console.log("消息缺少必要字段，无法处理");
			return;
		}

		const chatHistory = await getChatHistory(instanceId, chatId);

		// 将WAMessage[]转换为ChatMessage[]
		const formattedChatHistory = convertToFormatMessages(chatHistory);

		console.log(`收到来自 ${chatId} 的消息: ${messageContent}`);

		// 从Redis获取机器人配置
		const agentFromRedis = await getInstanceAgent(instanceId);

		// 检查此聊天是否启用了AI回复
		const isChatActive = await getChatAgentActive(instanceId, chatId);

		// 如果AI未启用，直接返回
		if (!isChatActive) {
			console.log(`与 ${chatId} 的聊天已禁用AI回复，跳过处理`);
			return;
		}

		// 添加消息到队列
		const { queueLength } = await enqueueMessage(
			instanceId,
			chatId,
			messageData,
			body,
		);

		// 处理队列（如果条件满足）
		const processResult = await processQueuedMessages(
			instanceId,
			chatId,
			queueLength,
		);

		// 如果不应处理（队列不稳定或Agent已在处理其他消息），返回等待状态
		if (!processResult.shouldProcess) {
			return;
		}

		// 如果没有内容可处理，返回
		if (!processResult.combinedContent || !processResult.firstMessage) {
			await markAgentIdle(instanceId, chatId);
			return;
		}

		console.log(
			`处理聊天 ${chatId} 的合并消息: ${processResult.combinedContent}`,
		);

		// 修改消息数据，使用合并内容
		const modifiedMessageData = {
			...processResult.firstMessage.messageData,
			body: processResult.combinedContent,
		};

		// 触发AI处理任务
		const handle = await whatsAppChat.trigger(
			{
				sessionName,
				webhookData: {
					...body,
					payload: modifiedMessageData,
				},
				instanceId,
				...(botPhoneNumber ? { botPhoneNumber } : {}),
				agent: agentFromRedis,
				userWahaApiEndpoint,
				userWahaApiKey,
				chatHistory: formattedChatHistory,
			},
			{
				tags: botPhoneNumber ? [botPhoneNumber] : [],
			},
		);

		// 监控处理状态
		let isCompleted = false;
		let hasError = false;

		try {
			for await (const run of runs.subscribeToRun(handle.id)) {
				// 当任务完成时标记Agent为空闲
				if (run.status === "COMPLETED") {
					isCompleted = true;
					await markAgentIdle(instanceId, chatId);
					console.log(`聊天 ${chatId} 的消息处理已完成`);

					// Agent完成处理后，检查队列是否有更多消息需要处理
					try {
						// 检查队列中是否有消息
						const queueCheck = await checkQueueAfterCompletion(
							instanceId,
							chatId,
						);

						if (queueCheck.hasMessages) {
							console.log(
								`检测到队列中还有 ${queueCheck.queueLength} 条待处理消息，触发新的处理流程`,
							);

							// 使用setTimeout异步触发新的处理，避免阻塞当前流程
							setTimeout(async () => {
								try {
									// 重新触发webhook处理
									await handleOtherMessage(
										instanceId,
										sessionName,
										{ from: chatId, body: "[QUEUE_CHECK]" }, // 创建一个虚拟消息触发处理
										body,
										botPhoneNumber,
										userWahaApiEndpoint,
										userWahaApiKey,
									);
								} catch (error) {
									console.error("触发队列检查处理失败:", error);
									// 确保在任何错误情况下都重置Agent状态
									await markAgentIdle(instanceId, chatId);
								}
							}, 500); // 稍微延迟以确保状态完全更新
						}
					} catch (error) {
						console.error("检查剩余队列消息失败:", error);
						// 确保在任何错误情况下都重置Agent状态
						await markAgentIdle(instanceId, chatId);
					}

					break; // 一旦完成就退出监控循环
				}

				if (run.status === "FAILED" || run.status === "CANCELED") {
					// 如果任务失败或被取消，也应重置Agent状态
					hasError = true;
					await markAgentIdle(instanceId, chatId);
					console.log(
						`聊天 ${chatId} 的消息处理已${run.status === "FAILED" ? "失败" : "取消"}`,
					);
					break;
				}
			}
		} catch (subscribeError) {
			console.error("监控处理状态失败:", subscribeError);
			hasError = true;
			// 确保在任何错误情况下都重置Agent状态
			await markAgentIdle(instanceId, chatId);
		}

		// 如果未能确定状态，手动重置
		if (!isCompleted && !hasError) {
			await markAgentIdle(instanceId, chatId);
			console.log(`聊天 ${chatId} 的消息处理状态无法确定，手动重置`);
		}

		// 返回成功响应
		return;
	} catch (error) {
		// 记录错误但仍然返回成功响应
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`触发WhatsApp消息处理失败: ${errorMessage}`);

		// 重置Agent状态，以便后续消息可以正常处理
		await markAgentIdle(instanceId, chatId);

		// 仍然返回成功以告知WhatsApp已收到webhook
		return;
	} finally {
		// 额外确保在所有情况下Agent状态都被重置为空闲
		if (chatId) {
			await markAgentIdle(instanceId, chatId);
		}
	}
}
