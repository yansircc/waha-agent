import {
	type KbSearcherPayload,
	kbSearcher,
} from "@/lib/ai-agents/kb-searcher";
import { getFormattedChatHistory } from "@/lib/chat-history-redis";
import type { WAMessage } from "@/types/api-responses";
import { logger, task } from "@trigger.dev/sdk";
import { chunkMessage } from "./message-chunker";
import type { WhatsAppMessagePayload, WhatsAppWebhookResponse } from "./types";
import { sendWebhookResponse } from "./utils";
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
			session,
			webhookData,
			webhookUrl,
			instanceId,
			agent,
			botPhoneNumber,
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
					session,
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
				logger.info("Skipping self-message", {
					chatId,
					botPhoneNumber,
				});
				return {
					success: true,
					skipped: true,
					reason: "Self-message",
				};
			}

			logger.info("Processing WhatsApp message", {
				chatId,
				messageId: messageData.id,
				messageLength: messageContent.length,
				session,
				instanceId,
				fromBot: botPhoneNumber ? chatId === botPhoneNumber : undefined,
			});

			// 1. 标记消息为已读
			await markMessageAsSeen(session, chatId, messageData.id);

			// 2. 开始输入状态
			await startTypingIndicator(session, chatId);

			// 3. 生成回复内容
			let aiResponse = "";

			// 使用AI代理或简单响应处理消息
			if (agent) {
				// 使用AI代理生成响应
				logger.info("Using AI agent for response", {
					agent,
					chatId,
				});

				try {
					// 获取聊天历史记录作为上下文
					let messages: Array<{ role: "user" | "assistant"; content: string }> =
						[{ role: "user", content: messageContent }];

					if (instanceId) {
						try {
							// 确定正确的会话伙伴ID
							const historyKey =
								botPhoneNumber && messageData.from !== botPhoneNumber
									? messageData.from // 消息来自用户，使用发送者ID
									: messageData.to; // 消息来自机器人，使用接收者ID

							if (historyKey) {
								// 检索并格式化以前的消息作为上下文
								const historyMessages = await getFormattedChatHistory(
									instanceId,
									historyKey,
									10,
								);

								if (historyMessages.length > 0) {
									logger.info("Retrieved chat history for context", {
										count: historyMessages.length,
										historyKey,
									});

									// 将历史记录与当前消息组合
									// 当前消息应该是最后一个
									messages = [
										...historyMessages,
										{ role: "user", content: messageContent },
									];
								}
							}
						} catch (historyError) {
							logger.warn("Failed to retrieve chat history", {
								error:
									historyError instanceof Error
										? historyError.message
										: String(historyError),
								chatId,
							});
							// 仅使用当前消息继续
						}
					}

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
			} else {
				// 如果没有提供代理，则简单回复
				aiResponse = `AFK for a while, I'll be back soon.`;
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
				session,
				chatId,
				chunks,
				delays,
				instanceId,
				botPhoneNumber,
				messageData.id,
			);

			// 6. 停止输入状态
			await stopTypingIndicator(session, chatId);

			logger.info("Sent WhatsApp response", {
				chatId,
				responseLength: aiResponse.length,
				chunks: chunks.length,
				session,
				instanceId,
				messageId: sendResult.messageId,
				usingAgent: !!agent,
				aiResponse:
					aiResponse.substring(0, 100) + (aiResponse.length > 100 ? "..." : ""),
			});

			// 7. 准备webhook响应
			if (webhookUrl) {
				const webhookData: WhatsAppWebhookResponse = {
					success: true,
					response: aiResponse,
					chatId,
					messageId: sendResult.messageId,
				};

				await sendWebhookResponse<WhatsAppWebhookResponse>(
					webhookUrl,
					webhookData,
				);
			}

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
				session,
				instanceId,
			});

			// 尝试向用户发送错误消息
			try {
				const messageData = webhookData.payload as Partial<WAMessage>;
				const chatId = messageData.from || messageData.chatId;

				if (chatId) {
					await sendErrorMessage(session, chatId);
				}
			} catch (sendError) {
				logger.error("Failed to send error message to user", {
					error:
						sendError instanceof Error ? sendError.message : String(sendError),
				});
			}

			// 通过webhook发送错误响应
			if (webhookUrl) {
				const errorResponse: WhatsAppWebhookResponse = {
					success: false,
					error: errorMessage,
				};

				await sendWebhookResponse<WhatsAppWebhookResponse>(
					webhookUrl,
					errorResponse,
				);
			}

			return {
				success: false,
				error: errorMessage,
			};
		}
	},
});
