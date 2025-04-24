import { BaseApiClient } from "./base";
import type {
	ChatRequest,
	MessageButtonReply,
	MessageContactVcardRequest,
	MessageFileRequest,
	MessageForwardRequest,
	MessageImageRequest,
	MessageLinkPreviewRequest,
	MessageLocationRequest,
	MessagePollRequest,
	MessageReactionRequest,
	MessageReplyRequest,
	MessageStarRequest,
	MessageTextRequest,
	MessageVideoRequest,
	MessageVoiceRequest,
	SendButtonsRequest,
	SendSeenRequest,
	WAMessage,
} from "./types";

export interface GetChatMessagesOptions {
	session?: string;
	chatId: string;
	limit?: number;
	offset?: number;
	downloadMedia?: boolean;
	filter?: {
		timestamp?: {
			lte?: number;
			gte?: number;
		};
		fromMe?: boolean;
	};
}

export interface ChatHistoryResponse {
	messages: WAMessage[];
}

// Chatting API client for sending messages through WhatsApp
export class ChattingApi extends BaseApiClient {
	/**
	 * Send a text message
	 */
	async sendText(data: MessageTextRequest): Promise<WAMessage> {
		try {
			const requestData = {
				chatId: data.chatId,
				text: data.text,
				session: data.session || "default",
				reply_to: null,
				linkPreview: true,
				linkPreviewHighQuality: false,
				...(data.mentionedIds && { mentionedIds: data.mentionedIds }),
			};

			return await this.post<WAMessage, typeof requestData>(
				"/api/sendText",
				requestData,
			);
		} catch (error) {
			throw new Error(
				`Failed to send text message: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Send an image message
	 */
	async sendImage(data: MessageImageRequest): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<WAMessage, Omit<MessageImageRequest, "session">>(
				`/api/${session}/sendImage`,
				requestData,
			);
		} catch (error) {
			throw new Error(
				`Failed to send image message: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Send a file
	 */
	async sendFile(data: MessageFileRequest): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<WAMessage, Omit<MessageFileRequest, "session">>(
				`/api/${session}/sendFile`,
				requestData,
			);
		} catch (error) {
			throw new Error(`Failed to send file: ${(error as Error).message}`);
		}
	}

	/**
	 * Send a voice message
	 */
	async sendVoice(data: MessageVoiceRequest): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<WAMessage, Omit<MessageVoiceRequest, "session">>(
				`/api/${session}/sendVoice`,
				requestData,
			);
		} catch (error) {
			throw new Error(
				`Failed to send voice message: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Send a video message
	 */
	async sendVideo(data: MessageVideoRequest): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<WAMessage, Omit<MessageVideoRequest, "session">>(
				`/api/${session}/sendVideo`,
				requestData,
			);
		} catch (error) {
			throw new Error(
				`Failed to send video message: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Send buttons (interactive message)
	 */
	async sendButtons(data: SendButtonsRequest): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<WAMessage, Omit<SendButtonsRequest, "session">>(
				`/api/${session}/sendButtons`,
				requestData,
			);
		} catch (error) {
			throw new Error(`Failed to send buttons: ${(error as Error).message}`);
		}
	}

	/**
	 * Forward a message
	 */
	async forwardMessage(data: MessageForwardRequest): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<WAMessage, Omit<MessageForwardRequest, "session">>(
				`/api/${session}/forwardMessage`,
				requestData,
			);
		} catch (error) {
			throw new Error(`Failed to forward message: ${(error as Error).message}`);
		}
	}

	/**
	 * Mark a chat as seen
	 */
	async sendSeen(data: SendSeenRequest): Promise<void> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			await this.post<void, Omit<SendSeenRequest, "session">>(
				`/api/${session}/sendSeen`,
				requestData,
			);
		} catch (error) {
			throw new Error(
				`Failed to mark chat as seen: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Start typing indicator in a chat
	 */
	async startTyping(data: ChatRequest): Promise<void> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			await this.post<void, Omit<ChatRequest, "session">>(
				`/api/${session}/startTyping`,
				requestData,
			);
		} catch (error) {
			throw new Error(`Failed to start typing: ${(error as Error).message}`);
		}
	}

	/**
	 * Stop typing indicator in a chat
	 */
	async stopTyping(data: ChatRequest): Promise<void> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			await this.post<void, Omit<ChatRequest, "session">>(
				`/api/${session}/stopTyping`,
				requestData,
			);
		} catch (error) {
			throw new Error(`Failed to stop typing: ${(error as Error).message}`);
		}
	}

	/**
	 * React to a message with an emoji
	 */
	async setReaction(data: MessageReactionRequest): Promise<void> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			await this.put<void, Omit<MessageReactionRequest, "session">>(
				`/api/${session}/reaction`,
				requestData,
			);
		} catch (error) {
			throw new Error(`Failed to set reaction: ${(error as Error).message}`);
		}
	}

	/**
	 * Star or unstar a message
	 */
	async setStar(data: MessageStarRequest): Promise<void> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			await this.put<void, Omit<MessageStarRequest, "session">>(
				`/api/${session}/star`,
				requestData,
			);
		} catch (error) {
			throw new Error(
				`Failed to star/unstar message: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Send a poll
	 */
	async sendPoll(data: MessagePollRequest): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<WAMessage, Omit<MessagePollRequest, "session">>(
				`/api/${session}/sendPoll`,
				requestData,
			);
		} catch (error) {
			throw new Error(`Failed to send poll: ${(error as Error).message}`);
		}
	}

	/**
	 * Send a location
	 */
	async sendLocation(data: MessageLocationRequest): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<
				WAMessage,
				Omit<MessageLocationRequest, "session">
			>(`/api/${session}/sendLocation`, requestData);
		} catch (error) {
			throw new Error(`Failed to send location: ${(error as Error).message}`);
		}
	}

	/**
	 * Send a link with preview
	 */
	async sendLinkPreview(data: MessageLinkPreviewRequest): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<
				WAMessage,
				Omit<MessageLinkPreviewRequest, "session">
			>(`/api/${session}/sendLinkPreview`, requestData);
		} catch (error) {
			throw new Error(
				`Failed to send link preview: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Send a contact vCard
	 */
	async sendContactVcard(data: MessageContactVcardRequest): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<
				WAMessage,
				Omit<MessageContactVcardRequest, "session">
			>(`/api/${session}/sendContactVcard`, requestData);
		} catch (error) {
			throw new Error(
				`Failed to send contact vCard: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Reply to a button message
	 */
	async sendButtonsReply(data: MessageButtonReply): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<WAMessage, Omit<MessageButtonReply, "session">>(
				`/api/${session}/send/buttons/reply`,
				requestData,
			);
		} catch (error) {
			throw new Error(
				`Failed to reply to button message: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Reply to a message (deprecated - use sendText with quotedMessageId instead)
	 */
	async reply(data: MessageReplyRequest): Promise<WAMessage> {
		try {
			const session = data.session || "default";
			const { session: _, ...requestData } = data;
			return await this.post<WAMessage, Omit<MessageReplyRequest, "session">>(
				`/api/${session}/reply`,
				requestData,
			);
		} catch (error) {
			throw new Error(
				`Failed to reply to message: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Get messages from a specific chat
	 */
	async getChatMessages(options: GetChatMessagesOptions): Promise<WAMessage[]> {
		try {
			const {
				session = "default",
				chatId,
				limit = 100,
				offset,
				downloadMedia = false,
				filter,
			} = options;

			// Build query parameters
			const queryParams = new URLSearchParams();
			queryParams.append("limit", limit.toString());
			queryParams.append("downloadMedia", downloadMedia.toString());

			if (offset !== undefined) {
				queryParams.append("offset", offset.toString());
			}

			if (filter?.timestamp?.lte) {
				queryParams.append(
					"filter.timestamp.lte",
					filter.timestamp.lte.toString(),
				);
			}

			if (filter?.timestamp?.gte) {
				queryParams.append(
					"filter.timestamp.gte",
					filter.timestamp.gte.toString(),
				);
			}

			if (filter?.fromMe !== undefined) {
				queryParams.append("filter.fromMe", filter.fromMe.toString());
			}

			const url = `/api/${session}/chats/${encodeURIComponent(chatId)}/messages?${queryParams.toString()}`;

			return await this.get<WAMessage[]>(url);
		} catch (error) {
			throw new Error(
				`Failed to get chat messages: ${(error as Error).message}`,
			);
		}
	}
}
