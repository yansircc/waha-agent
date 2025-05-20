import type {
	ChatRequest,
	MessageTextRequest,
	SendSeenRequest,
	WAMessage,
} from "@/types/waha";
import { BaseApiClient } from "./base";

interface GetChatMessagesOptions {
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

// Chatting API client for WhatsApp chatting functionality
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
	 * Mark a chat as seen
	 */
	async sendSeen(data: SendSeenRequest): Promise<void> {
		try {
			const session = data.session || "default";
			await this.post<void, SendSeenRequest>("/api/sendSeen", {
				...data,
				session,
			});
			// 成功后直接返回
			return;
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
			await this.post<void, ChatRequest>("/api/startTyping", {
				...data,
				session,
			});
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
			await this.post<void, ChatRequest>("/api/stopTyping", {
				...data,
				session,
			});
		} catch (error) {
			throw new Error(`Failed to stop typing: ${(error as Error).message}`);
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
