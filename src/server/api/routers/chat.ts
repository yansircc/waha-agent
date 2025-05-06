import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { agentChat } from "@/trigger/agent-chat";
import {
	type Agent,
	AgentSchema,
	type ApiMessage,
	ApiMessageSchema,
	type Message,
} from "@/types/agents";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { nanoid } from "nanoid";
import { z } from "zod";

// In-memory storage for tasks
interface ChatTask {
	taskId: string;
	status: "processing" | "completed";
	response?: string;
	conversationId: string;
	agentId?: string;
	messages: Message[];
}

const chatTasks = new Map<string, ChatTask>();

export const chatRouter = createTRPCRouter({
	triggerAgentChat: protectedProcedure
		.input(
			z.object({
				messages: z
					.array(ApiMessageSchema)
					.min(1, "At least one message is required"),
				agent: AgentSchema,
				conversationId: z.string().optional(),
				kbIds: z.array(z.string()).nullable(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// Generate messageId and conversationId if not provided
				const messageId = nanoid();
				const conversationId = input.conversationId || `conv-${nanoid()}`;

				// Trigger the agent chat task
				const handle = await agentChat.trigger({
					...input,
					messageId,
					conversationId,
				});

				// Create a public access token specific to this run
				const publicAccessToken = await triggerAuth.createPublicToken({
					scopes: {
						read: {
							runs: [handle.id],
						},
					},
				});

				return {
					success: true,
					handle,
					token: publicAccessToken,
					messageId,
					conversationId,
				};
			} catch (error) {
				console.error("[tRPC] Error triggering agent chat task:", error);
				throw new Error("Failed to trigger agent chat task");
			}
		}),
});
