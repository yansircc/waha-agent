import { mastraClient } from "@/lib/mastra";
import { logger, task } from "@trigger.dev/sdk/v3";

interface AgentChatPayload {
	messages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	userId: string;
	agentId: string;
	conversationId: string;
	webhookUrl: string;
}

interface WebhookResponse {
	success: boolean;
	response?: string;
	messages?: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	error?: string;
	userId: string;
	agentId: string;
	conversationId: string;
}

async function sendWebhookResponse(
	webhookUrl: string,
	data: WebhookResponse,
): Promise<void> {
	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			logger.error("Failed to send webhook response", {
				status: response.status,
				statusText: response.statusText,
			});
		}
	} catch (error) {
		logger.error("Error sending webhook response", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export const agentChat = task({
	id: "agent-chat",
	run: async (payload: AgentChatPayload) => {
		const { messages, userId, agentId, conversationId, webhookUrl } = payload;

		try {
			// Get the RAG agent
			const agent = mastraClient.getAgent("ragAgent");

			if (!agent) {
				throw new Error("Agent not found");
			}

			// Generate response
			const result = await agent.generate({
				messages: messages.map((message) => ({
					role: message.role,
					content: message.content,
				})),
			});

			// Prepare webhook response
			const webhookData: WebhookResponse = {
				success: true,
				response: result.text,
				messages: [...messages, { role: "assistant", content: result.text }],
				userId,
				agentId,
				conversationId,
			};

			// Log success
			logger.info("Chat generation completed", {
				userId,
				agentId,
				conversationId,
				messageCount: messages.length,
			});

			// Send webhook response
			await sendWebhookResponse(webhookUrl, webhookData);

			return webhookData;
		} catch (error) {
			// Prepare error response
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const errorResponse: WebhookResponse = {
				success: false,
				error: errorMessage,
				userId,
				agentId,
				conversationId,
			};

			// Log error
			logger.error("Chat generation failed", {
				error: errorMessage,
				userId,
				agentId,
				conversationId,
			});

			// Send error webhook response
			await sendWebhookResponse(webhookUrl, errorResponse);

			return errorResponse;
		}
	},
});
