import { z } from "zod";

// 基础类型验证模式
export const Base64FileSchema = z.object({
	mimetype: z.string(),
	data: z.string(),
});

export const ButtonSchema = z.object({
	id: z.string(),
	text: z.string(),
});

// Session相关验证模式
export const SessionStatusEnum = z.enum([
	"STARTING",
	"RUNNING",
	"STOPPED",
	"ERROR",
	"SCAN_QR_CODE",
	"WORKING",
]);

// Webhook 相关验证模式
export const WebhookSchema = z.object({
	url: z.string().url(),
	events: z.array(z.string()),
	hmac: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),
	retries: z.union([z.number(), z.record(z.unknown()), z.null()]).optional(),
	customHeaders: z.record(z.string()).nullable().optional(),
});

export const SessionConfigSchema = z.object({
	metadata: z
		.record(
			z.union([
				z.string(),
				z.number(),
				z.boolean(),
				z.null(),
				z.record(z.unknown()),
			]),
		)
		.optional(),
	proxy: z.string().nullable().optional(),
	debug: z.boolean().optional().default(false),
	noweb: z
		.object({
			store: z
				.object({
					enabled: z.boolean().optional().default(true),
					fullSync: z.boolean().optional().default(false),
				})
				.optional(),
		})
		.optional(),
	webhooks: z.array(WebhookSchema).optional(),
});

export const SessionInfoSchema = z.object({
	id: z.string().optional(),
	name: z.string(),
	status: SessionStatusEnum,
	config: SessionConfigSchema,
	qrCode: z.string().optional(),
	error: z.string().optional(),
	updatedAt: z.string().optional(),
	createdAt: z.string().optional(),
	apiKey: z.string().optional(),
});

// 请求相关验证模式
export const SessionCreateRequestSchema = z.object({
	name: z.string().optional().default("default"),
	config: SessionConfigSchema,
	start: z.boolean().optional().default(true),
	userId: z.string().optional(),
});

export const SessionUpdateRequestSchema = z.object({
	config: SessionConfigSchema,
});

// Profile相关验证模式
export const MyProfileSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	pushname: z.string(),
	phoneNumber: z.string(),
	status: z.string().optional(),
	pictureUrl: z.string().optional(),
});

export const ProfileNameRequestSchema = z.object({
	name: z.string(),
});

export const ProfileStatusRequestSchema = z.object({
	status: z.string(),
});

export const ProfilePictureRequestSchema = z.object({
	file: Base64FileSchema,
});

// 通用结果验证模式
export const ResultSchema = z.object({
	success: z.boolean(),
	message: z.string().optional(),
});

// 实例相关验证模式
export const InstanceStatusEnum = z.enum([
	"connected",
	"disconnected",
	"connecting",
]);

export const InstanceSchema = z.object({
	id: z.string(),
	name: z.string(),
	phoneNumber: z.string().optional(),
	status: InstanceStatusEnum,
	agentId: z.string().optional(),
	qrCode: z.string().optional(),
	sessionData: z.record(z.unknown()).optional(),
	createdById: z.string(),
	createdAt: z.date(),
	updatedAt: z.date().optional(),
});

// 代理相关验证模式
export const AgentSchema = z.object({
	id: z.string(),
	name: z.string(),
	prompt: z.string(),
	model: z.string(),
	kbIds: z.array(z.string()).nullable(),
	createdById: z.string(),
	createdAt: z.date(),
	updatedAt: z.date().optional(),
});

// Auth相关验证模式
export const QRCodeRequestSchema = z.object({
	session: z.string().default("default"),
	format: z.enum(["image", "raw"]).default("image"),
});

export const RequestCodeRequestSchema = z.object({
	phoneNumber: z.string(),
	method: z.enum(["sms", "call"]).optional(),
});

// 消息相关验证模式 - 使用继承关系重构
export const WAMessageSchema = z
	.object({
		id: z.string(),
		timestamp: z.number(),
		fromMe: z.boolean(),
		author: z.string().optional(),
		chatId: z.string(),
		type: z.string(),
		body: z.string(),
	})
	.passthrough(); // 允许额外字段

// 基础请求Schema
export const BaseRequestSchema = z.object({
	session: z.string().default("default"),
});

// 聊天请求基础Schema
export const ChatRequestSchema = BaseRequestSchema.extend({
	chatId: z.string(),
});

// 可引用消息的请求Schema
export const QuotableRequestSchema = ChatRequestSchema.extend({
	quotedMessageId: z.string().optional(),
});

// 可提及用户的请求Schema
export const MentionableRequestSchema = QuotableRequestSchema.extend({
	mentionedIds: z.array(z.string()).optional(),
});

// 媒体请求基础Schema
export const MediaRequestSchema = QuotableRequestSchema.extend({
	file: Base64FileSchema.optional(),
	url: z.string().optional(),
});

// 带说明的媒体请求Schema
export const CaptionedMediaRequestSchema = MediaRequestSchema.extend({
	caption: z.string().optional(),
	text: z.string().optional(), // Caption的别名
});

// 文本消息请求Schema
export const MessageTextRequestSchema = MentionableRequestSchema.extend({
	text: z.string(),
});

// 图片消息请求Schema
export const MessageImageRequestSchema = CaptionedMediaRequestSchema.extend({
	mentionedIds: z.array(z.string()).optional(),
});

// 文件消息请求Schema
export const MessageFileRequestSchema = CaptionedMediaRequestSchema;

// 语音消息请求Schema
export const MessageVoiceRequestSchema = MediaRequestSchema;

// 视频消息请求Schema
export const MessageVideoRequestSchema = CaptionedMediaRequestSchema.extend({
	mentionedIds: z.array(z.string()).optional(),
});

// 按钮消息请求Schema
export const SendButtonsRequestSchema = QuotableRequestSchema.extend({
	buttons: z.array(ButtonSchema),
	text: z.string(),
	footer: z.string().optional(),
});

// 转发消息请求Schema
export const MessageForwardRequestSchema = ChatRequestSchema.extend({
	messageId: z.string(),
});

// 已读请求Schema
export const SendSeenRequestSchema = ChatRequestSchema;

// 反应请求Schema
export const MessageReactionRequestSchema = BaseRequestSchema.extend({
	messageId: z.string(),
	reaction: z.string(),
});

// 星标请求Schema
export const MessageStarRequestSchema = BaseRequestSchema.extend({
	messageIds: z.array(z.string()),
	star: z.boolean(),
});

// 投票请求Schema
export const MessagePollRequestSchema = QuotableRequestSchema.extend({
	name: z.string(),
	options: z.array(z.string()),
});

// 位置请求Schema
export const MessageLocationRequestSchema = QuotableRequestSchema.extend({
	latitude: z.number(),
	longitude: z.number(),
	title: z.string().optional(),
});

// 链接预览请求Schema
export const MessageLinkPreviewRequestSchema = QuotableRequestSchema.extend({
	text: z.string(),
	previewUrl: z.string(),
});

// 联系人名片请求Schema
export const MessageContactVcardRequestSchema = QuotableRequestSchema.extend({
	contactId: z.string(),
});

// 按钮回复请求Schema
export const MessageButtonReplySchema = ChatRequestSchema.extend({
	messageId: z.string(),
	buttonId: z.string(),
});

// 消息回复请求Schema
export const MessageReplyRequestSchema = ChatRequestSchema.extend({
	messageId: z.string(),
	text: z.string(),
});

// Mastra API schemas
export const MastraMessageSchema = z.object({
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
});

export const MastraGenerateRequestSchema = z.object({
	messages: z.array(MastraMessageSchema),
	threadId: z.string().optional(),
	resourceId: z.string().optional(),
	runId: z.string().optional(),
	output: z.record(z.unknown()).optional(),
});

export const MastraGenerateResponseSchema = z.object({
	text: z.string(),
	threadId: z.string().optional(),
	resourceId: z.string().optional(),
	runId: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export const GetChatMessagesRequestSchema = z.object({
	session: z.string().default("default"),
	chatId: z.string(),
	limit: z.number().default(100),
	offset: z.number().optional(),
	downloadMedia: z.boolean().default(false),
	filter: z
		.object({
			timestamp: z
				.object({
					lte: z.number().optional(),
					gte: z.number().optional(),
				})
				.optional(),
			fromMe: z.boolean().optional(),
		})
		.optional(),
});
