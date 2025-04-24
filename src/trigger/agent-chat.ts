import { type VercelAIAgentPayload, vercelAIAgent } from "@/lib/vercel-ai";
import type { Agent } from "@/types/agents";
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

			const vercelAIAgentPayload: VercelAIAgentPayload = {
				messages: messages.map((message) => ({
					role: message.role,
					content: message.content,
				})),
				agent,
			};

			// 调用已更新的vercelAIAgent函数(内部已包含混合搜索逻辑)
			const result = await vercelAIAgent(vercelAIAgentPayload);

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
