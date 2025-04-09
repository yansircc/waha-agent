import { type NextRequest, NextResponse } from "next/server";

// Simple in-memory store for chat responses
// In a real app, this would be stored in a database
interface ChatResponse {
	status: "processing" | "completed";
	response?: string;
	error?: string;
	timestamp: number;
	messageId?: string; // 添加消息ID以区分同一对话的不同消息
}

// 存储对话历史
interface Conversation {
	messages: Array<{
		role: "user" | "assistant";
		content: string;
		timestamp: number;
		messageId: string;
	}>;
	lastResponseTimestamp: number;
}

// 按对话ID存储响应
const conversationResponses = new Map<string, ChatResponse>();

// 存储完整对话历史
const conversationHistory = new Map<string, Conversation>();

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const conversationId = url.searchParams.get("conversationId");
	const messageId = url.searchParams.get("messageId"); // 允许查询特定消息的响应

	if (!conversationId) {
		return NextResponse.json(
			{ error: "conversationId is required" },
			{ status: 400 },
		);
	}

	console.log(
		`[Status API] Checking status for conversation: ${conversationId}, messageId: ${messageId || "latest"}`,
	);

	// 查询对话响应
	const response = conversationResponses.get(conversationId);

	if (!response) {
		console.log(
			`[Status API] No response found for conversation: ${conversationId}`,
		);
		return NextResponse.json({ status: "processing" });
	}

	// 如果指定了messageId，检查它是否匹配
	if (messageId && response.messageId !== messageId) {
		console.log(
			`[Status API] Response exists but messageId doesn't match. Looking for: ${messageId}, found: ${response.messageId}`,
		);
		return NextResponse.json({ status: "processing" });
	}

	console.log(
		`[Status API] Found response for conversation: ${conversationId}, status: ${response.status}`,
	);

	// 返回找到的响应
	return NextResponse.json(response);
}

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
		`[Status API] Stored response for conversation: ${conversationId}, messageId: ${responseMessageId}`,
	);

	// 用于调试
	console.log(
		"[Status API] Current conversation history:",
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
		`[Status API] Stored user message for conversation: ${conversationId}, messageId: ${messageId}`,
	);

	return messageId;
}

// For testing and debugging
export { conversationResponses, conversationHistory };
