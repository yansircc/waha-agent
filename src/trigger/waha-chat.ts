import {
	type KbSearcherPayload,
	kbSearcher,
} from "@/lib/ai-agents/kb-searcher";
import {
	addMessageToChatHistory,
	getFormattedChatHistory,
} from "@/lib/chat-history-redis";
import { wahaApi } from "@/lib/waha-api";
import type { Agent } from "@/types/agents";
import type { WAMessage, WebhookNotification } from "@/types/api-responses";
import { logger, task } from "@trigger.dev/sdk";
import { type WebhookResponse, sendWebhookResponse } from "./utils";

export interface AgentChatPayload {
	messages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	agent: Agent;
	conversationId: string;
	webhookUrl: string;
	messageId?: string;
}

// Extend the generic webhook response for agent chat
interface ChatWebhookResponse extends WebhookResponse {
	response?: string;
	messages?: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	agent: Agent;
	conversationId: string;
	messageId?: string;
}

export interface WhatsAppMessagePayload {
	session: string;
	webhookData: WebhookNotification;
	webhookUrl?: string;
	instanceId: string;
	agent?: Agent;
	botPhoneNumber?: string;
}

// Extend the generic webhook response for WhatsApp chat
interface WhatsAppWebhookResponse extends WebhookResponse {
	response?: string;
	chatId?: string;
	messageId?: string;
}

export const agentChat = task({
	id: "agent-chat",
	run: async (payload: AgentChatPayload) => {
		const { messages, agent, conversationId, webhookUrl, messageId } = payload;

		try {
			// Log start of processing
			logger.info("Starting chat generation", {
				agentId: agent.id,
				kbIds: agent.kbIds,
				conversationId,
				messageId,
				messageCount: messages.length,
			});

			const kbSearcherPayload: KbSearcherPayload = {
				messages: messages.map((message) => ({
					role: message.role,
					content: message.content,
				})),
				agent,
			};

			const result = await kbSearcher(kbSearcherPayload);

			// Prepare webhook response
			const webhookData: ChatWebhookResponse = {
				success: true,
				response: result.text,
				messages: [...messages, { role: "assistant", content: result.text }],
				agent,
				conversationId,
				messageId,
			};

			// Log success
			logger.info("Chat generation completed", {
				agent,
				conversationId,
				messageId,
				messageCount: messages.length,
				responseLength: result.text.length,
			});

			// Send webhook response
			logger.debug("Sending webhook response", {
				url: webhookUrl,
				success: true,
			});

			await sendWebhookResponse<ChatWebhookResponse>(webhookUrl, webhookData);

			return webhookData;
		} catch (error) {
			// Prepare error response
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const errorResponse: ChatWebhookResponse = {
				success: false,
				error: errorMessage,
				agent,
				conversationId,
				messageId,
			};

			// Log error
			logger.error("Chat generation failed", {
				error: errorMessage,
				agent,
				conversationId,
				messageId,
			});

			// Send error webhook response
			logger.debug("Sending error webhook response", {
				url: webhookUrl,
				success: false,
			});

			await sendWebhookResponse<ChatWebhookResponse>(webhookUrl, errorResponse);

			return errorResponse;
		}
	},
});

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
			// Extract message data
			const messageData = webhookData.payload as Partial<WAMessage>;

			const chatId = messageData.from || messageData.chatId || "";
			const messageContent = messageData.body || "";

			// Validate required fields
			if (!chatId || !messageContent) {
				logger.warn("Message missing required fields", {
					chatId,
					hasContent: !!messageContent,
					session,
					instanceId,
				});
				return { success: false, error: "Missing required message fields" };
			}

			// Skip processing if this is a message from the bot to itself
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
				messageLength: messageContent.length,
				session,
				instanceId,
				fromBot: botPhoneNumber ? chatId === botPhoneNumber : undefined,
			});

			// Show typing indicator before processing
			// await wahaApi.chatting.startTyping({
			// 	session,
			// 	chatId,
			// });

			let aiResponse = "";

			// Process message - either with AI agent or simple response
			if (agent) {
				// Use AI agent to generate response
				logger.info("Using AI agent for response", {
					agent,
					chatId,
				});

				try {
					// Get chat history for context
					let messages: Array<{ role: "user" | "assistant"; content: string }> =
						[{ role: "user", content: messageContent }];

					if (instanceId) {
						try {
							// Determine the correct conversation partner ID for chat history
							const historyKey =
								botPhoneNumber && messageData.from !== botPhoneNumber
									? messageData.from // Message is from user, use sender ID
									: messageData.to; // Message is from bot, use recipient ID

							if (historyKey) {
								// Retrieve and format previous messages for context
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

									// Combine history with current message
									// The current message should be the last one
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
							// Continue with just the current message
						}
					}

					// Create message format for the KB searcher with context
					const kbSearcherPayload: KbSearcherPayload = {
						messages,
						agent,
					};

					// Call the KB searcher
					const result = await kbSearcher(kbSearcherPayload);
					aiResponse = result.text;
				} catch (aiError) {
					logger.error("AI processing error", {
						error: aiError instanceof Error ? aiError.message : String(aiError),
						agentId: agent.id,
					});
					// Fallback response in case of AI error
					aiResponse =
						"I'm having trouble understanding. Could you please rephrase your question?";
				}
			} else {
				// Simple echo response if no agent is provided
				aiResponse = `I received your message: "${messageContent}". How can I help you?`;
			}

			// Send response through WhatsApp API
			const sendResult = await wahaApi.chatting.sendText({
				session,
				chatId: chatId,
				text: aiResponse,
				linkPreview: true,
				reply_to: messageData.id || null,
			});

			// Add sent message to chat history if we have instance ID
			if (instanceId && sendResult) {
				try {
					// Determine the correct conversation partner ID for chat history
					const historyKey =
						messageData.from === botPhoneNumber
							? messageData.to // If bot is sending, use recipient
							: messageData.from; // If user is sending, use sender

					if (historyKey) {
						// Use the conversation partner ID as the history key
						await addMessageToChatHistory(instanceId, historyKey, sendResult);
						logger.info("Added response to chat history", {
							instanceId,
							historyKey,
							messageId: sendResult.id,
						});
					}
				} catch (historyError) {
					logger.error("Failed to add message to chat history", {
						error:
							historyError instanceof Error
								? historyError.message
								: String(historyError),
						instanceId,
						chatId,
					});
					// Non-critical error, continue processing
				}
			}

			// Stop typing indicator
			// await wahaApi.chatting.stopTyping({
			// 	session,
			// 	chatId,
			// });

			logger.info("Sent WhatsApp response", {
				chatId,
				responseLength: aiResponse.length,
				session,
				instanceId,
				messageId: sendResult.id,
				usingAgent: !!agent,
				aiResponse:
					aiResponse.substring(0, 100) + (aiResponse.length > 100 ? "..." : ""),
			});

			// Prepare webhook response if a URL was provided
			if (webhookUrl) {
				const webhookData: WhatsAppWebhookResponse = {
					success: true,
					response: aiResponse,
					chatId,
					messageId: sendResult.id,
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
				messageId: sendResult.id,
			};
		} catch (error) {
			// Handle errors
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			logger.error("WhatsApp message processing failed", {
				error: errorMessage,
				session,
				instanceId,
			});

			// Try to send an error message to the user
			try {
				const messageData = webhookData.payload as Partial<WAMessage>;
				const chatId = messageData.from || messageData.chatId;

				if (chatId) {
					await wahaApi.chatting.sendText({
						session,
						chatId,
						text: "Sorry, AFK for a while, I'll be back soon.",
						linkPreview: false,
					});
				}
			} catch (sendError) {
				logger.error("Failed to send error message to user", {
					error:
						sendError instanceof Error ? sendError.message : String(sendError),
				});
			}

			// Send error response via webhook if URL provided
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
