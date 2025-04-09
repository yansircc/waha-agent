import { env } from "@/env";
import { wahaAgent } from "@/lib/waha-agent";
import { db } from "@/server/db";
import { logger, task } from "@trigger.dev/sdk/v3";

interface ChatGenerationPayload {
	messages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	agentId?: string;
	userId: string;
	webhookUrl?: string;
	conversationId?: string;
}

export const chatGenerationTask = task({
	id: "chat-generation",
	maxDuration: 300, // 5 minutes max duration

	run: async (payload: ChatGenerationPayload) => {
		const { messages, agentId, userId, webhookUrl, conversationId } = payload;

		logger.log("Starting chat generation", {
			userId,
			agentId: agentId || "default",
			messagesCount: messages.length,
		});

		try {
			// Get the last user message as query content
			const lastMessage = messages[messages.length - 1];
			if (!lastMessage || lastMessage.role !== "user" || !lastMessage.content) {
				throw new Error(
					"Invalid request: last message must be from user with content",
				);
			}

			logger.log("Generating response with Waha Agent", {
				agentId: agentId || "default",
				messageContent: `${lastMessage.content.substring(0, 100)}...`,
			});

			// Fetch agent configuration if agentId is provided
			let agentConfig = {
				apiKey: env.OPENROUTER_API_KEY,
				model: "openai/gpt-4o-mini",
				prompt:
					"You are a helpful assistant that provides accurate information based on the documents provided. If the information is not in the documents, say so.",
				documentId: "default",
			};

			if (agentId) {
				const agent = await db.query.agents.findFirst({
					where: (a, { eq, and }) =>
						and(eq(a.id, agentId), eq(a.createdById, userId)),
				});

				if (!agent) {
					throw new Error(
						"Agent not found or you don't have permission to use it",
					);
				}

				agentConfig = {
					apiKey: env.OPENROUTER_API_KEY,
					model: "openai/gpt-4o-mini",
					prompt: agent.prompt || agentConfig.prompt,
					documentId: agent.id,
				};
			}

			// Use wahaAgent to generate response
			const result = await wahaAgent({
				...agentConfig,
				prompt: `${agentConfig.prompt}\n\nUser query: ${lastMessage.content}`,
			});

			if (!result.success) {
				throw new Error(result.message || "Failed to generate response");
			}

			const responseText = result.response;

			logger.log("Response generated successfully", {
				responseLength: responseText?.length || 0,
				usedDocuments: result.documents?.length || 0,
				responseText,
			});

			// Build complete message list with new assistant reply
			const updatedMessages = [
				...messages,
				{
					role: "assistant" as const,
					content: responseText || "No response generated",
				},
			];

			// If webhook URL is provided, notify results
			if (webhookUrl) {
				await fetch(webhookUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						success: true,
						response: responseText,
						documents: result.documents || [],
						messages: updatedMessages,
						userId,
						agentId, // Pass original agentId, webhook will check validity
						conversationId,
					}),
				});

				logger.log("Webhook notification sent", { webhookUrl });
			}

			return {
				success: true,
				response: responseText,
				documents: result.documents || [],
				messages: updatedMessages,
			};
		} catch (error) {
			logger.error("Error generating chat response", {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});

			// If webhook URL is provided, notify failure
			if (webhookUrl) {
				await fetch(webhookUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						success: false,
						error: error instanceof Error ? error.message : String(error),
						userId,
						agentId,
						conversationId,
					}),
				});
			}

			throw error;
		}
	},
});
