// WhatsApp API共通请求类型

// Session创建、更新、启动和停止的请求类型
export interface SessionCreateRequest {
	name?: string;
	config?: SessionConfig;
	start?: boolean;
}

export interface SessionUpdateRequest {
	config?: SessionConfig;
}

export interface SessionStartRequest {
	session?: string;
}

export interface SessionStopRequest {
	session?: string;
}

export interface SessionLogoutRequest {
	session?: string;
}

// 基础文件结构
interface Base64File {
	mimetype: string;
	data: string;
}

// Authentication-related类型
interface QRCodeRequest {
	session?: string;
	format?: "image" | "raw";
}

export interface RequestCodeRequest {
	phoneNumber: string;
	method?: "sms" | "call";
}

// Profile-related类型
interface ProfileNameRequest {
	name: string;
}

interface ProfileStatusRequest {
	status: string;
}

interface ProfilePictureRequest {
	file: Base64File;
}

// Messaging-related类型
interface MessageTextRequest {
	session?: string;
	chatId: string;
	text: string;
	quotedMessageId?: string;
	reply_to?: string | null;
	mentionedIds?: string[];
	linkPreview?: boolean;
	linkPreviewHighQuality?: boolean;
}

interface MessageImageRequest {
	session?: string;
	chatId: string;
	caption?: string;
	text?: string; // Alias for caption
	file?: Base64File;
	url?: string;
	quotedMessageId?: string;
	mentionedIds?: string[];
}

interface MessageFileRequest {
	session?: string;
	chatId: string;
	caption?: string;
	text?: string; // Alias for caption
	file?: Base64File;
	url?: string;
	quotedMessageId?: string;
}

interface MessageVoiceRequest {
	session?: string;
	chatId: string;
	file?: Base64File;
	url?: string;
	quotedMessageId?: string;
}

interface MessageVideoRequest {
	session?: string;
	chatId: string;
	caption?: string;
	text?: string; // Alias for caption
	file?: Base64File;
	url?: string;
	quotedMessageId?: string;
	mentionedIds?: string[];
}

interface Button {
	id: string;
	text: string;
}

interface SendButtonsRequest {
	session?: string;
	chatId: string;
	buttons: Button[];
	text: string;
	footer?: string;
	quotedMessageId?: string;
}

// 其他消息请求类型
interface MessageForwardRequest {
	session?: string;
	chatId: string;
	messageId: string;
}

interface ChatRequest {
	session?: string;
	chatId: string;
}

interface MessageReactionRequest {
	session?: string;
	messageId: string;
	reaction: string;
}

interface MessageStarRequest {
	session?: string;
	messageIds: string[];
	star: boolean;
}

interface MessagePollRequest {
	session?: string;
	chatId: string;
	name: string;
	options: string[];
	quotedMessageId?: string;
}

interface MessageLocationRequest {
	session?: string;
	chatId: string;
	latitude: number;
	longitude: number;
	title?: string;
	quotedMessageId?: string;
}

interface MessageLinkPreviewRequest {
	session?: string;
	chatId: string;
	text: string;
	previewUrl: string;
	quotedMessageId?: string;
}

interface MessageContactVcardRequest {
	session?: string;
	chatId: string;
	contactId: string;
	quotedMessageId?: string;
}

interface MessageButtonReplyRequest {
	session?: string;
	chatId: string;
	messageId: string;
	buttonId: string;
}

interface MessageReplyRequest {
	session?: string;
	chatId: string;
	messageId: string;
	text: string;
}

// Webhook通用配置类型
export interface WebhookConfig {
	url: string;
	events: string[];
	hmac?: string | null;
	retries?: number | null;
	customHeaders?: Record<string, string> | null;
}

export interface SessionConfig {
	metadata?: Record<
		string,
		string | number | boolean | null | Record<string, unknown>
	>;
	proxy?: string | null;
	debug?: boolean;
	noweb?: {
		store?: {
			enabled?: boolean;
			fullSync?: boolean;
		};
	};
	webhooks?: WebhookConfig[];
}
