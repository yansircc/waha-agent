import {
	type KbSearcherPayload,
	kbSearcher,
} from "@/lib/ai-agents/kb-searcher";
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
		const { session, webhookData, webhookUrl, instanceId, agent } = payload;

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

			logger.info("Processing WhatsApp message", {
				chatId,
				messageLength: messageContent.length,
				session,
				instanceId,
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
					// Create message format for the KB searcher
					const kbSearcherPayload: KbSearcherPayload = {
						messages: [{ role: "user", content: messageContent }],
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
