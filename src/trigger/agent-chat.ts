import { kbSearcher } from "@/lib/ai-agents/kb-searcher";
import { AgentSchema, ApiMessageSchema } from "@/types/agents";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

// Define the schema for the payload
const AgentChatSchema = z.object({
	messages: z.array(ApiMessageSchema),
	agent: AgentSchema,
	conversationId: z.string(),
	kbIds: z.array(z.string()).nullable(),
	messageId: z.string(),
});

export type AgentChatSchemaPayload = z.infer<typeof AgentChatSchema>;

export const agentChat = schemaTask({
	id: "agent-chat",
	schema: AgentChatSchema,
	run: async (payload) => {
		const { messages, agent, conversationId, messageId, kbIds } = payload;

		try {
			// Log start of processing
			logger.info("Starting chat generation", {
				agentId: agent.id,
				kbIds: agent.kbIds || kbIds,
				conversationId,
				messageId,
				messageCount: messages.length,
			});

			const kbSearcherPayload = {
				messages: messages.map((message) => ({
					role: message.role,
					content: message.content,
				})),
				agent,
			};

			// Call the KB searcher function
			const result = await kbSearcher(kbSearcherPayload);

			// Create response with the new assistant message
			const responseMessage = {
				role: "assistant" as const,
				content: result.text,
			};

			// Return the result
			return {
				success: true,
				response: result.text,
				messages: [...messages, responseMessage],
				agent,
				conversationId,
				messageId,
			};
		} catch (error) {
			// Log error
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			logger.error("Chat generation failed", {
				error: errorMessage,
				agent,
				conversationId,
				messageId,
			});

			// Return error response
			return {
				success: false,
				error: errorMessage,
				agent,
				conversationId,
				messageId,
			};
		}
	},
});
