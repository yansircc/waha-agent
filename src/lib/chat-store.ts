// Simple redis-backed store for chat responses
import {
	parseJsonValueIfNeeded,
	redis,
	safeRedisOperation,
	stringifyValueIfNeeded,
} from "@/lib/redis";

// Redis key prefixes
const CONVERSATION_RESPONSE_PREFIX = "chat:response:";
const CONVERSATION_HISTORY_PREFIX = "chat:history:";

export interface ChatResponse {
	status: "processing" | "completed";
	response?: string;
	error?: string;
	timestamp: number;
	messageId?: string; // 消息ID以区分同一对话的不同消息
}

// 存储对话历史
export interface Conversation {
	messages: Array<{
		role: "user" | "assistant";
		content: string;
		timestamp: number;
		messageId: string;
	}>;
	lastResponseTimestamp: number;
}

// 为存储响应添加messageId参数
export async function storeResponse(
	conversationId: string,
	response: string,
	error?: string,
	messageId?: string,
) {
	if (!conversationId) return;

	const timestamp = Date.now();

	// 生成一个消息ID如果没有提供
	const responseMessageId = messageId || `msg-${timestamp}`;

	// 创建响应对象
	const responseObj: ChatResponse = {
		status: "completed",
		response,
		error,
		timestamp,
		messageId: responseMessageId,
	};

	try {
		// 存储响应到Redis - 使用安全操作
		await safeRedisOperation(async () => {
			const responseKey = `${CONVERSATION_RESPONSE_PREFIX}${conversationId}:${responseMessageId}`;
			await redis.set(responseKey, stringifyValueIfNeeded(responseObj));

			// 添加messageId到该会话的消息ID集合中，用于列出所有消息
			await redis.sadd(
				`${CONVERSATION_RESPONSE_PREFIX}${conversationId}:msgs`,
				responseMessageId,
			);

			// 获取对话历史或创建新的
			const historyKey = `${CONVERSATION_HISTORY_PREFIX}${conversationId}`;
			const existingHistoryJson = await redis.get(historyKey);
			const existingHistory = existingHistoryJson
				? parseJsonValueIfNeeded(existingHistoryJson)
				: null;

			let conversation: Conversation;
			if (existingHistory) {
				conversation = existingHistory as Conversation;
			} else {
				conversation = {
					messages: [],
					lastResponseTimestamp: 0,
				};
			}

			// 添加助手消息到历史
			conversation.messages.push({
				role: "assistant",
				// 如果存在错误，在内容中显示错误信息，否则显示响应内容
				content: error ? `Error: ${error}` : response,
				timestamp,
				messageId: responseMessageId,
			});

			conversation.lastResponseTimestamp = timestamp;

			// 保存更新后的历史到Redis
			await redis.set(historyKey, stringifyValueIfNeeded(conversation));
		});

		console.log(
			`[Chat Store] Stored response for conversation: ${conversationId}, messageId: ${responseMessageId}${error ? `, with error: ${error}` : ""}`,
		);
	} catch (err) {
		console.error("[Chat Store] Failed to store response:", err);
	}
}

// 添加用户消息到历史记录的辅助函数
export async function storeUserMessage(
	conversationId: string,
	content: string,
) {
	if (!conversationId) return;

	const timestamp = Date.now();
	const messageId = `msg-user-${timestamp}`;

	try {
		// 使用安全操作
		await safeRedisOperation(async () => {
			// 获取现有对话或创建新对话
			const historyKey = `${CONVERSATION_HISTORY_PREFIX}${conversationId}`;
			const existingHistoryJson = await redis.get(historyKey);
			const existingHistory = existingHistoryJson
				? parseJsonValueIfNeeded(existingHistoryJson)
				: null;

			let conversation: Conversation;
			if (existingHistory) {
				conversation = existingHistory as Conversation;
			} else {
				conversation = {
					messages: [],
					lastResponseTimestamp: 0,
				};
			}

			// 添加用户消息
			conversation.messages.push({
				role: "user",
				content,
				timestamp,
				messageId,
			});

			// 保存更新的对话到Redis
			await redis.set(historyKey, stringifyValueIfNeeded(conversation));
		});

		console.log(
			`[Chat Store] Stored user message for conversation: ${conversationId}, messageId: ${messageId}`,
		);

		return messageId;
	} catch (err) {
		console.error("[Chat Store] Failed to store user message:", err);
		return messageId; // 即使出错也返回messageId，以便前端能继续
	}
}

// 获取响应函数
export async function getResponseByConversationId(
	conversationId: string,
	messageId?: string,
): Promise<ChatResponse | null> {
	if (!conversationId) return null;

	try {
		// 使用安全操作
		return await safeRedisOperation(async () => {
			// 如果指定了messageId，直接获取该消息
			if (messageId) {
				const responseKey = `${CONVERSATION_RESPONSE_PREFIX}${conversationId}:${messageId}`;
				const responseJson = await redis.get(responseKey);

				if (responseJson) {
					return parseJsonValueIfNeeded(responseJson) as ChatResponse;
				}
				return null;
			}

			// 如果没有指定messageId，获取该会话的所有消息ID
			const messageIds = await redis.smembers(
				`${CONVERSATION_RESPONSE_PREFIX}${conversationId}:msgs`,
			);

			if (!messageIds.length) {
				return null;
			}

			// 获取所有响应
			let latestResponse: ChatResponse | null = null;
			let latestTimestamp = 0;

			for (const msgId of messageIds) {
				const responseKey = `${CONVERSATION_RESPONSE_PREFIX}${conversationId}:${msgId}`;
				const responseJson = await redis.get(responseKey);

				if (responseJson) {
					const response = parseJsonValueIfNeeded(responseJson) as ChatResponse;
					if (response.timestamp > latestTimestamp) {
						latestResponse = response;
						latestTimestamp = response.timestamp;
					}
				}
			}

			return latestResponse;
		});
	} catch (err) {
		console.error("[Chat Store] Failed to get response:", err);
		return null;
	}
}

// 定义用于调试的消息摘要信息
interface MessageSummary {
	status: "processing" | "completed";
	hasResponse: boolean;
	error?: string;
	timestamp: number;
}

// 定义会话摘要信息的类型
interface ConversationSummary {
	[messageId: string]: MessageSummary;
}

// 添加调试辅助函数 - 搜索所有存储的消息，方便诊断问题
export async function getAllStoredMessages(): Promise<
	Record<string, ConversationSummary>
> {
	try {
		return await safeRedisOperation(async () => {
			const result: Record<string, ConversationSummary> = {};

			// 获取所有会话ID
			const convKeys = await redis.keys(
				`${CONVERSATION_RESPONSE_PREFIX}*:msgs`,
			);

			for (const key of convKeys) {
				// 从key中提取会话ID
				const convId = key
					.replace(`${CONVERSATION_RESPONSE_PREFIX}`, "")
					.replace(":msgs", "");
				result[convId] = {};

				// 获取该会话的所有消息ID
				const messageIds = await redis.smembers(key);

				// 获取每条消息的内容
				for (const msgId of messageIds) {
					const responseKey = `${CONVERSATION_RESPONSE_PREFIX}${convId}:${msgId}`;
					const responseJson = await redis.get(responseKey);

					if (responseJson) {
						const response = parseJsonValueIfNeeded(
							responseJson,
						) as ChatResponse;
						result[convId][msgId] = {
							status: response.status,
							hasResponse: !!response.response,
							error: response.error,
							timestamp: response.timestamp,
						};
					}
				}
			}

			return result;
		});
	} catch (err) {
		console.error("[Chat Store] Failed to get all stored messages:", err);
		return {};
	}
}

// 定义消息搜索结果类型
interface MessageSearchResult {
	conversationId: string;
	response: ChatResponse;
}

// 搜索特定消息ID的函数
export async function findMessageById(
	messageId: string,
): Promise<MessageSearchResult[]> {
	try {
		return await safeRedisOperation(async () => {
			const results: MessageSearchResult[] = [];

			// 获取所有会话ID
			const convKeys = await redis.keys(
				`${CONVERSATION_RESPONSE_PREFIX}*:msgs`,
			);

			for (const key of convKeys) {
				// 从key中提取会话ID
				const convId = key
					.replace(`${CONVERSATION_RESPONSE_PREFIX}`, "")
					.replace(":msgs", "");

				// 检查该ID是否在这个会话的消息集合中
				const isMember = await redis.sismember(key, messageId);

				if (isMember) {
					const responseKey = `${CONVERSATION_RESPONSE_PREFIX}${convId}:${messageId}`;
					const responseJson = await redis.get(responseKey);

					if (responseJson) {
						const response = parseJsonValueIfNeeded(
							responseJson,
						) as ChatResponse;
						results.push({
							conversationId: convId,
							response,
						});
					}
				}
			}

			return results;
		});
	} catch (err) {
		console.error("[Chat Store] Failed to find message by ID:", err);
		return [];
	}
}
