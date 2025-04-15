// import { mastraClient } from "@/lib/mastra";
import { type VercelAIAgentPayload, vercelAIAgent } from "@/lib/vercel-ai";
import { logger, task } from "@trigger.dev/sdk/v3";
import { type WebhookResponse, sendWebhookResponse } from "./utils";

export interface AgentChatPayload {
	messages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	userId: string;
	agentId: string;
	kbIds: string[];
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
	userId: string;
	agentId: string;
	conversationId: string;
	messageId?: string;
}

export const agentChat = task({
	id: "agent-chat",
	run: async (payload: AgentChatPayload) => {
		const {
			messages,
			userId,
			agentId,
			kbIds,
			conversationId,
			webhookUrl,
			messageId,
		} = payload;

		try {
			// // Log start of processing
			logger.info("Starting chat generation", {
				userId,
				agentId,
				kbIds,
				conversationId,
				messageId,
				messageCount: messages.length,
			});

			const vercelAIAgentPayload: VercelAIAgentPayload = {
				messages: messages.map((message) => ({
					role: message.role,
					content: message.content,
				})),
				userId,
				kbIds,
			};

			const result = await vercelAIAgent(vercelAIAgentPayload);

			// Prepare webhook response
			const webhookData: ChatWebhookResponse = {
				success: true,
				response: result.text,
				messages: [...messages, { role: "assistant", content: result.text }],
				userId,
				agentId,
				conversationId,
				messageId,
			};

			// Log success
			logger.info("Chat generation completed", {
				userId,
				agentId,
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
				userId,
				agentId,
				conversationId,
				messageId,
			};

			// Log error
			logger.error("Chat generation failed", {
				error: errorMessage,
				userId,
				agentId,
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
