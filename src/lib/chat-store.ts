// Simple in-memory store for chat responses
// In a real app, this would be stored in a database
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

// 按对话ID存储响应
export const conversationResponses = new Map<string, ChatResponse>();

// 存储完整对话历史
export const conversationHistory = new Map<string, Conversation>();

// 为存储响应添加messageId参数
export function storeResponse(
	conversationId: string,
	response: string,
	error?: string,
	messageId?: string,
) {
	if (!conversationId) return;

	const timestamp = Date.now();

	// 生成一个消息ID如果没有提供
	const responseMessageId = messageId || `msg-${timestamp}`;

	// 存储响应
	conversationResponses.set(conversationId, {
		status: "completed",
		response,
		error,
		timestamp,
		messageId: responseMessageId,
	});

	// 更新对话历史
	const conversation = conversationHistory.get(conversationId) || {
		messages: [],
		lastResponseTimestamp: 0,
	};

	// 添加助手消息到历史
	conversation.messages.push({
		role: "assistant",
		content: response,
		timestamp,
		messageId: responseMessageId,
	});

	conversation.lastResponseTimestamp = timestamp;

	// 保存更新后的历史
	conversationHistory.set(conversationId, conversation);

	console.log(
		`[Chat Store] Stored response for conversation: ${conversationId}, messageId: ${responseMessageId}`,
	);

	// 用于调试
	console.log(
		"[Chat Store] Current conversation history:",
		JSON.stringify(conversationHistory.get(conversationId), null, 2),
	);
}

// 添加用户消息到历史记录的辅助函数
export function storeUserMessage(conversationId: string, content: string) {
	if (!conversationId) return;

	const timestamp = Date.now();
	const messageId = `msg-user-${timestamp}`;

	// 获取现有对话或创建新对话
	const conversation = conversationHistory.get(conversationId) || {
		messages: [],
		lastResponseTimestamp: 0,
	};

	// 添加用户消息
	conversation.messages.push({
		role: "user",
		content,
		timestamp,
		messageId,
	});

	// 保存更新的对话
	conversationHistory.set(conversationId, conversation);

	console.log(
		`[Chat Store] Stored user message for conversation: ${conversationId}, messageId: ${messageId}`,
	);

	return messageId;
}

// 获取响应函数
export function getResponseByConversationId(
	conversationId: string,
	messageId?: string,
): ChatResponse | null {
	if (!conversationId) return null;

	const response = conversationResponses.get(conversationId);

	if (!response) return null;

	// 如果指定了messageId，检查它是否匹配
	if (messageId && response.messageId !== messageId) {
		return null;
	}

	return response;
}
