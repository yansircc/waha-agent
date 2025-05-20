import type { Agent } from "@/types/agents";
import type { WebhookNotification } from "@/types/waha";

/**
 * 消息角色类型
 */
export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

/**
 * 通用webhook响应接口
 */
export interface WebhookResponse {
	success: boolean;
	error?: string;
	[key: string]: unknown;
}

/**
 * WhatsApp消息处理的payload接口
 */
export interface WhatsAppMessagePayload {
	sessionName: string;
	webhookData: WebhookNotification;
	instanceId: string;
	agent: Agent;
	chatHistory: ChatMessage[];
	botPhoneNumber?: string;
	userWahaApiEndpoint?: string;
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
