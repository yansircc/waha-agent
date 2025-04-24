import {
	addMessageToChatHistory,
	chatHistoryExists,
	deleteChatHistory,
	getChatHistory,
	getChatHistoryMeta,
	initializeChatHistory,
} from "@/lib/chat-history-redis";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const chatHistoryRouter = createTRPCRouter({
	// Check if chat history exists
	exists: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				chatId: z.string(),
			}),
		)
		.query(async ({ input }) => {
			return chatHistoryExists(input.instanceId, input.chatId);
		}),

	// Get chat history
	get: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				chatId: z.string(),
				limit: z.number().optional(),
			}),
		)
		.query(async ({ input }) => {
			return getChatHistory(input.instanceId, input.chatId, input.limit);
		}),

	// Get chat history metadata
	getMeta: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				chatId: z.string(),
			}),
		)
		.query(async ({ input }) => {
			return getChatHistoryMeta(input.instanceId, input.chatId);
		}),

	// Initialize chat history
	initialize: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				session: z.string().default("default"),
				chatId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			return initializeChatHistory(
				input.instanceId,
				input.session,
				input.chatId,
			);
		}),

	// Delete chat history
	delete: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				chatId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			return deleteChatHistory(input.instanceId, input.chatId);
		}),
});
