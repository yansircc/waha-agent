import type { Agent } from "@/types/agents";
import type { WAMessage, WebhookNotification } from "@/types/api-responses";

/**
 * 通用webhook响应接口
 */
export interface WebhookResponse {
	success: boolean;
	error?: string;
	[key: string]: unknown;
}

/**
 * Agent聊天的payload接口
 */
export interface AgentChatPayload {
	messages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	agent: Agent;
	conversationId: string;
	webhookUrl: string;
	messageId?: string;
}

/**
 * Agent聊天的webhook响应接口
 */
export interface ChatWebhookResponse extends WebhookResponse {
	response?: string;
	messages?: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	agent: Agent;
	conversationId: string;
	messageId?: string;
}

/**
 * WhatsApp消息处理的payload接口
 */
export interface WhatsAppMessagePayload {
	session: string;
	webhookData: WebhookNotification;
	instanceId: string;
	agent?: Agent;
	botPhoneNumber?: string;
}

/**
 * WhatsApp消息的webhook响应接口
 */
export interface WhatsAppWebhookResponse extends WebhookResponse {
	response?: string;
	chatId?: string;
	messageId?: string;
}

/**
 * 消息分块的配置选项
 */
export interface MessageChunkingOptions {
	idealChunkSize: number;
	minTypingDelay: number;
	maxAdditionalDelay: number;
}

/**
 * 消息分块的结果
 */
export interface MessageChunkingResult {
	chunks: string[];
	delays: number[];
}

/**
 * 消息发送的结果
 */
export interface MessageSendResult {
	success: boolean;
	messageId?: string;
	chatId?: string;
	response?: string;
	error?: string;
}
