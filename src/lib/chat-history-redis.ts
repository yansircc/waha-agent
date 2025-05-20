import {
	getRedisForInstance,
	parseJsonValueIfNeeded,
	safeRedisOperation,
	stringifyValueIfNeeded,
} from "@/lib/redis";
import { createInstanceApiClient } from "@/lib/waha-api";
import type { WAMessage } from "@/types/waha";

// Redis key prefixes for chat history
const CHAT_HISTORY_PREFIX = "chat-history:";
const CHAT_HISTORY_META_PREFIX = "chat-history-meta:";

// Maximum number of messages to store per chat
const MAX_CHAT_HISTORY_MESSAGES = 1000;

// Default session name
const DEFAULT_SESSION = "default";

/**
 * Chat history metadata
 */
interface ChatHistoryMeta {
	messageCount: number;
	lastUpdated: number;
	firstMessageTs?: number;
	lastMessageTs?: number;
}

/**
 * Get the Redis key for a chat's history
 */
function getChatHistoryKey(instanceId: string, chatId: string): string {
	return `${CHAT_HISTORY_PREFIX}${instanceId}:${chatId}`;
}

/**
 * Get the Redis key for a chat's history metadata
 */
function getChatHistoryMetaKey(instanceId: string, chatId: string): string {
	return `${CHAT_HISTORY_META_PREFIX}${instanceId}:${chatId}`;
}

/**
 * Check if a chat history exists in Redis
 */
export async function chatHistoryExists(
	instanceId: string,
	chatId: string,
): Promise<boolean> {
	try {
		const redis = getRedisForInstance(instanceId);
		const key = getChatHistoryKey(instanceId, chatId);

		// Check if the key exists
		const exists = await safeRedisOperation(() => redis.exists(key));
		return exists === 1;
	} catch (error) {
		console.error(
			`Failed to check if chat history exists for ${chatId}:`,
			error,
		);
		return false;
	}
}

/**
 * Get chat history from Redis
 */
export async function getChatHistory(
	instanceId: string,
	chatId: string,
	limit = MAX_CHAT_HISTORY_MESSAGES,
): Promise<WAMessage[]> {
	try {
		const redis = getRedisForInstance(instanceId);
		const key = getChatHistoryKey(instanceId, chatId);

		// Get messages from Redis (most recent first)
		const messages = await safeRedisOperation(() =>
			redis.lrange(key, 0, limit - 1),
		);

		// Parse each message
		return messages.map((msg) => parseJsonValueIfNeeded(msg) as WAMessage);
	} catch (error) {
		console.error(`Failed to get chat history for ${chatId}:`, error);
		return [];
	}
}

/**
 * Add message to chat history in Redis
 */
export async function addMessageToChatHistory(
	instanceId: string,
	chatId: string,
	message: WAMessage,
): Promise<boolean> {
	try {
		const redis = getRedisForInstance(instanceId);
		const historyKey = getChatHistoryKey(instanceId, chatId);
		const metaKey = getChatHistoryMetaKey(instanceId, chatId);

		// 检查消息是否已存在（通过消息ID）
		if (message.id) {
			// 获取历史记录中的前10条消息检查重复
			const recentMessages = await safeRedisOperation(() =>
				redis.lrange(historyKey, 0, 9),
			);

			// 检查消息ID是否已存在
			const isDuplicate = recentMessages.some((msgStr) => {
				try {
					const msg = parseJsonValueIfNeeded(msgStr) as WAMessage;
					return msg.id === message.id;
				} catch {
					return false;
				}
			});

			if (isDuplicate) {
				console.log(`跳过重复消息 ID: ${message.id}`);
				return true; // 重复消息也视为成功
			}
		}

		// Serialize the message
		const serializedMessage = stringifyValueIfNeeded(message);

		// Add to the beginning of the list (most recent first)
		await safeRedisOperation(() => redis.lpush(historyKey, serializedMessage));

		// Trim the list to maximum size
		await safeRedisOperation(() =>
			redis.ltrim(historyKey, 0, MAX_CHAT_HISTORY_MESSAGES - 1),
		);

		// Update metadata
		let meta: ChatHistoryMeta = {
			messageCount: 1,
			lastUpdated: Date.now(),
			firstMessageTs: message.timestamp,
			lastMessageTs: message.timestamp,
		};

		// Try to get existing metadata
		const existingMeta = await safeRedisOperation(() => redis.get(metaKey));
		if (existingMeta) {
			const parsedMeta = parseJsonValueIfNeeded(
				existingMeta,
			) as ChatHistoryMeta;
			meta = {
				messageCount: parsedMeta.messageCount + 1,
				lastUpdated: Date.now(),
				firstMessageTs: Math.min(
					parsedMeta.firstMessageTs || Number.POSITIVE_INFINITY,
					message.timestamp,
				),
				lastMessageTs: Math.max(
					parsedMeta.lastMessageTs || 0,
					message.timestamp,
				),
			};
		}

		// Save updated metadata
		await safeRedisOperation(() =>
			redis.set(metaKey, stringifyValueIfNeeded(meta)),
		);

		return true;
	} catch (error) {
		console.error(
			`Failed to add message to chat history for ${chatId}:`,
			error,
		);
		return false;
	}
}

/**
 * Initialize chat history from WhatsApp API
 */
export async function initializeChatHistory(
	instanceId: string,
	session: string,
	chatId: string,
	userWahaApiEndpoint?: string,
): Promise<boolean> {
	try {
		// Check if history already exists
		const exists = await chatHistoryExists(instanceId, chatId);
		if (exists) {
			console.log(
				`Chat history for ${chatId} already exists, skipping initialization`,
			);
			return true;
		}

		console.log(`Initializing chat history for ${chatId} from WhatsApp API`);

		// Fetch messages from WhatsApp API
		const messages = await createInstanceApiClient(
			userWahaApiEndpoint,
		).chatting.getChatMessages({
			session: session || DEFAULT_SESSION,
			chatId,
			limit: MAX_CHAT_HISTORY_MESSAGES,
			downloadMedia: false,
		});

		if (!messages.length) {
			console.log(`No messages found for ${chatId}, creating empty history`);
			return true;
		}

		console.log(
			`Found ${messages.length} messages for ${chatId}, saving to Redis`,
		);

		// Save each message to Redis
		const redis = getRedisForInstance(instanceId);
		const historyKey = getChatHistoryKey(instanceId, chatId);
		const metaKey = getChatHistoryMetaKey(instanceId, chatId);

		// Prepare batch of serialized messages
		const serializedMessages = messages.map((msg) =>
			stringifyValueIfNeeded(msg),
		);

		// Add all messages to Redis in a single operation
		if (serializedMessages.length > 0) {
			await safeRedisOperation(() =>
				redis.rpush(historyKey, ...serializedMessages),
			);
		}

		// Create metadata
		const timestamps = messages.map((msg) => msg.timestamp);
		const meta: ChatHistoryMeta = {
			messageCount: messages.length,
			lastUpdated: Date.now(),
			firstMessageTs: Math.min(...timestamps),
			lastMessageTs: Math.max(...timestamps),
		};

		// Save metadata
		await safeRedisOperation(() =>
			redis.set(metaKey, stringifyValueIfNeeded(meta)),
		);

		console.log(`Successfully initialized chat history for ${chatId}`);
		return true;
	} catch (error) {
		console.error(`Failed to initialize chat history for ${chatId}:`, error);
		return false;
	}
}

/**
 * Delete chat history for a specific chat
 */
export async function deleteChatHistory(
	instanceId: string,
	chatId: string,
): Promise<boolean> {
	try {
		const redis = getRedisForInstance(instanceId);
		const historyKey = getChatHistoryKey(instanceId, chatId);
		const metaKey = getChatHistoryMetaKey(instanceId, chatId);

		// Delete history and metadata
		await safeRedisOperation(() => redis.del(historyKey, metaKey));

		console.log(`Successfully deleted chat history for ${chatId}`);
		return true;
	} catch (error) {
		console.error(`Failed to delete chat history for ${chatId}:`, error);
		return false;
	}
}

/**
 * Get chat history metadata
 */
export async function getChatHistoryMeta(
	instanceId: string,
	chatId: string,
): Promise<ChatHistoryMeta | null> {
	try {
		const redis = getRedisForInstance(instanceId);
		const metaKey = getChatHistoryMetaKey(instanceId, chatId);

		// Get metadata
		const meta = await safeRedisOperation(() => redis.get(metaKey));

		if (!meta) {
			return null;
		}

		return parseJsonValueIfNeeded(meta) as ChatHistoryMeta;
	} catch (error) {
		console.error(`Failed to get chat history metadata for ${chatId}:`, error);
		return null;
	}
}

/**
 * 获取格式化的聊天历史记录，用于AI上下文
 * 将Redis中的聊天记录转换为AI可用的消息格式
 */
export async function getFormattedChatHistory(
	instanceId: string,
	chatId: string,
	limit = 10, // 默认只获取最近10条消息用于上下文
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
	try {
		// 获取原始聊天记录
		const messages = await getChatHistory(instanceId, chatId, limit);

		if (!messages.length) {
			return [];
		}

		// 将消息转换为AI格式
		// 消息按时间从新到旧排序，但我们需要从旧到新，所以反转
		const sortedMessages = [...messages].reverse();

		// 转换为AI可用的消息格式
		return sortedMessages.map((msg) => {
			// fromMe=true 表示是助手发送的消息
			// fromMe=false 表示是用户发送的消息
			return {
				role: msg.fromMe ? "assistant" : "user",
				content: msg.body,
			};
		});
	} catch (error) {
		console.error("获取格式化聊天历史记录失败:", error);
		return []; // 出错时返回空数组
	}
}
