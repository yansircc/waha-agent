import { wahaApi } from "@/lib/waha-api";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	ChatRequestSchema,
	MessageButtonReplySchema,
	MessageContactVcardRequestSchema,
	MessageFileRequestSchema,
	MessageForwardRequestSchema,
	MessageImageRequestSchema,
	MessageLinkPreviewRequestSchema,
	MessageLocationRequestSchema,
	MessagePollRequestSchema,
	MessageReactionRequestSchema,
	MessageReplyRequestSchema,
	MessageStarRequestSchema,
	MessageTextRequestSchema,
	MessageVideoRequestSchema,
	MessageVoiceRequestSchema,
	SendButtonsRequestSchema,
	SendSeenRequestSchema,
	WAMessageSchema,
} from "@/types/schemas";
import { z } from "zod";

export const wahaChattingRouter = createTRPCRouter({
	// Send a text message
	sendText: protectedProcedure
		.input(MessageTextRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.sendText(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(
					`Failed to send text message: ${(error as Error).message}`,
				);
			}
		}),

	// Send an image
	sendImage: protectedProcedure
		.input(MessageImageRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.sendImage(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(`Failed to send image: ${(error as Error).message}`);
			}
		}),

	// Send a file
	sendFile: protectedProcedure
		.input(MessageFileRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.sendFile(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(`Failed to send file: ${(error as Error).message}`);
			}
		}),

	// Send a voice message
	sendVoice: protectedProcedure
		.input(MessageVoiceRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.sendVoice(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(
					`Failed to send voice message: ${(error as Error).message}`,
				);
			}
		}),

	// Send a video
	sendVideo: protectedProcedure
		.input(MessageVideoRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.sendVideo(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(`Failed to send video: ${(error as Error).message}`);
			}
		}),

	// Send buttons
	sendButtons: protectedProcedure
		.input(SendButtonsRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.sendButtons(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(`Failed to send buttons: ${(error as Error).message}`);
			}
		}),

	// Forward a message
	forwardMessage: protectedProcedure
		.input(MessageForwardRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.forwardMessage(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(
					`Failed to forward message: ${(error as Error).message}`,
				);
			}
		}),

	// Mark a chat as seen
	sendSeen: protectedProcedure
		.input(SendSeenRequestSchema)
		.mutation(async ({ input }) => {
			try {
				await wahaApi.chatting.sendSeen(input);
				return { success: true };
			} catch (error) {
				throw new Error(
					`Failed to mark chat as seen: ${(error as Error).message}`,
				);
			}
		}),

	// Start typing indicator
	startTyping: protectedProcedure
		.input(ChatRequestSchema)
		.mutation(async ({ input }) => {
			try {
				await wahaApi.chatting.startTyping(input);
				return { success: true };
			} catch (error) {
				throw new Error(`Failed to start typing: ${(error as Error).message}`);
			}
		}),

	// Stop typing indicator
	stopTyping: protectedProcedure
		.input(ChatRequestSchema)
		.mutation(async ({ input }) => {
			try {
				await wahaApi.chatting.stopTyping(input);
				return { success: true };
			} catch (error) {
				throw new Error(`Failed to stop typing: ${(error as Error).message}`);
			}
		}),

	// React to a message
	setReaction: protectedProcedure
		.input(MessageReactionRequestSchema)
		.mutation(async ({ input }) => {
			try {
				await wahaApi.chatting.setReaction(input);
				return { success: true };
			} catch (error) {
				throw new Error(`Failed to set reaction: ${(error as Error).message}`);
			}
		}),

	// Star or unstar a message
	setStar: protectedProcedure
		.input(MessageStarRequestSchema)
		.mutation(async ({ input }) => {
			try {
				await wahaApi.chatting.setStar(input);
				return { success: true };
			} catch (error) {
				throw new Error(
					`Failed to star/unstar message: ${(error as Error).message}`,
				);
			}
		}),

	// Send a poll
	sendPoll: protectedProcedure
		.input(MessagePollRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.sendPoll(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(`Failed to send poll: ${(error as Error).message}`);
			}
		}),

	// Send a location
	sendLocation: protectedProcedure
		.input(MessageLocationRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.sendLocation(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(`Failed to send location: ${(error as Error).message}`);
			}
		}),

	// Send a link with preview
	sendLinkPreview: protectedProcedure
		.input(MessageLinkPreviewRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.sendLinkPreview(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(
					`Failed to send link preview: ${(error as Error).message}`,
				);
			}
		}),

	// Send a contact vCard
	sendContactVcard: protectedProcedure
		.input(MessageContactVcardRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.sendContactVcard(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(
					`Failed to send contact vCard: ${(error as Error).message}`,
				);
			}
		}),

	// Reply to a button message
	sendButtonsReply: protectedProcedure
		.input(MessageButtonReplySchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.sendButtonsReply(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(
					`Failed to reply to button message: ${(error as Error).message}`,
				);
			}
		}),

	// Reply to a message (deprecated)
	reply: protectedProcedure
		.input(MessageReplyRequestSchema)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.chatting.reply(input);
				return WAMessageSchema.parse(result);
			} catch (error) {
				throw new Error(
					`Failed to reply to message: ${(error as Error).message}`,
				);
			}
		}),
});
