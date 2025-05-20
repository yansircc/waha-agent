import {
	type KbSearcherPayload,
	kbSearcher,
} from "@/lib/ai-agents/kb-searcher";
import type { WAMessage } from "@/types/waha";
import { logger, task } from "@trigger.dev/sdk";
import { chunkMessage } from "./message-chunker";
import type { ChatMessage, WhatsAppMessagePayload } from "./types";
import {
	markMessageAsSeen,
	sendErrorMessage,
	sendMessageChunks,
	startTypingIndicator,
	stopTypingIndicator,
} from "./whatsapp-sender";

/**
 * WhatsApp消息处理任务 - 处理接收到的WhatsApp消息并生成回复
 */
export const whatsAppChat = task({
	id: "whatsapp-chat",
	run: async (payload: WhatsAppMessagePayload) => {
		const {
			sessionName,
			webhookData,
			instanceId,
			agent,
			botPhoneNumber,
			userWahaApiEndpoint,
			userWahaApiKey,
			chatHistory,
		} = payload;

		try {
			// 提取消息数据
			const messageData = webhookData.payload as Partial<WAMessage>;
			const chatId = messageData.from || messageData.chatId || "";
			const messageContent = messageData.body || "";

			// 验证必需字段
			if (!chatId || !messageContent) {
				logger.warn("Message missing required fields", {
					chatId,
					hasContent: !!messageContent,
					sessionName,
					instanceId,
				});
				return { success: false, error: "Missing required message fields" };
			}

			// 跳过处理机器人发给自己的消息
			if (
				botPhoneNumber &&
				chatId === botPhoneNumber &&
				messageData.to === botPhoneNumber
			) {
				return {
					success: true,
					skipped: true,
					reason: "Self-message",
				};
			}

			// 1. 标记消息为已读
			await markMessageAsSeen(
				sessionName,
				chatId,
				messageData.id,
				userWahaApiEndpoint,
				userWahaApiKey,
			);

			// 2. 开始输入状态
			await startTypingIndicator(
				sessionName,
				chatId,
				userWahaApiEndpoint,
				userWahaApiKey,
			);

			// 3. 生成回复内容
			let aiResponse = "";

			// 使用AI机器人或简单响应处理消息

			try {
				// 获取聊天历史记录作为上下文
				const messages: ChatMessage[] = [
					...chatHistory,
					{ role: "user", content: messageContent },
				];

				logger.info("Chat history", {
					messages,
				});

				// 创建带上下文的KB搜索器的消息格式
				const kbSearcherPayload: KbSearcherPayload = {
					messages,
					agent,
				};

				// 调用KB搜索器
				const result = await kbSearcher(kbSearcherPayload);
				aiResponse = result.text;
			} catch (aiError) {
				logger.error("AI processing error", {
					error: aiError instanceof Error ? aiError.message : String(aiError),
					agentId: agent.id,
				});
				// AI错误时的后备响应
				aiResponse = "Sorry, busy handling other things.";
			}

			// 4. 使用AI驱动的chunk-splitter分割消息
			const { chunks, delays } = await chunkMessage(
				aiResponse,
				agent?.apiKey || "",
				{
					idealChunkSize: 120, // WhatsApp中适合的块大小
					minTypingDelay: 800,
					maxAdditionalDelay: 2000,
				},
			);

			// 5. 发送消息块
			const sendResult = await sendMessageChunks(
				sessionName,
				chatId,
				chunks,
				delays,
				userWahaApiEndpoint,
				userWahaApiKey,
			);

			// 6. 停止输入状态
			await stopTypingIndicator(
				sessionName,
				chatId,
				userWahaApiEndpoint,
				userWahaApiKey,
			);

			return {
				success: true,
				chatId,
				response: aiResponse,
				messageId: sendResult.messageId,
			};
		} catch (error) {
			// 处理错误
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			logger.error("WhatsApp message processing failed", {
				error: errorMessage,
				sessionName,
				instanceId,
			});

			// 尝试向用户发送错误消息
			try {
				const messageData = webhookData.payload as Partial<WAMessage>;
				const chatId = messageData.from || messageData.chatId;

				if (chatId) {
					await sendErrorMessage(
						sessionName,
						chatId,
						userWahaApiEndpoint,
						userWahaApiKey,
					);
				}
			} catch (sendError) {
				logger.error("Failed to send error message to user", {
					error:
						sendError instanceof Error ? sendError.message : String(sendError),
				});
			}

			return {
				success: false,
				error: errorMessage,
			};
		}
	},
});
