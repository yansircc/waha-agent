// WAHA API 共享类型定义

// 基础文件和二进制数据类型
export interface Base64File {
	mimetype: string;
	data: string;
}

// Webhook 配置类型
export interface WebhookConfig {
	url: string;
	events: string[];
	hmac?: string | null;
	retries?: number | null;
	customHeaders?: Record<string, string> | null;
}

// 会话配置类型
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

// 通用请求接口
interface SessionRequest {
	session?: string;
}

export interface ChatRequest extends SessionRequest {
	chatId: string;
}

// QR 码相关
export interface QRCodeValue {
	code: string;
}

// 请求码请求
export interface RequestCodeRequest {
	phoneNumber: string;
	method?: "sms" | "call";
}

// 基本结果类型
export interface Result {
	success: boolean;
	message?: string;
}

// 会话操作请求类型
export interface AppSessionCreateRequest {
	name?: string;
	config?: SessionConfig;
	start?: boolean;
}

export interface ApiSessionCreateRequest {
	name?: string;
	config?: Record<string, unknown>;
	start?: boolean;
}

export interface ApiSessionUpdateRequest {
	config?: Record<string, unknown>;
}

export interface ApiSessionStartRequest {
	name?: string;
	config?: Record<string, unknown>;
	start?: boolean;
}

export interface AppSessionStopRequest {
	session?: string;
}

export interface ApiSessionStopRequest {
	name?: string;
	logout?: boolean;
}

export interface AppSessionLogoutRequest {
	session?: string;
}

export interface ApiSessionLogoutRequest {
	name?: string;
}

// 类型转换辅助函数
export function convertAppToApiSessionCreate(
	appRequest: AppSessionCreateRequest,
): ApiSessionCreateRequest {
	return {
		name: appRequest.name,
		start: appRequest.start,
		config: appRequest.config as unknown as Record<string, unknown>,
	};
}

export function convertAppToApiSessionStop(
	appRequest: AppSessionStopRequest,
	logout?: boolean,
): ApiSessionStopRequest {
	return {
		name: appRequest.session,
		logout,
	};
}

export function convertAppToApiSessionLogout(
	appRequest: AppSessionLogoutRequest,
): ApiSessionLogoutRequest {
	return {
		name: appRequest.session,
	};
}

// Profile 相关请求类型
export interface ProfileNameRequest {
	name: string;
}

export interface ProfileStatusRequest {
	status: string;
}

export interface ProfilePictureRequest {
	file: Base64File;
}

// 消息相关请求类型
export interface MessageTextRequest extends SessionRequest {
	chatId: string;
	text: string;
	linkPreview?: boolean;
	reply_to?: string | null;
	mentionedIds?: string[];
}

export interface SendSeenRequest extends SessionRequest {
	chatId: string;
	messageId?: string;
	participant?: string | null;
}

// WhatsApp API共通响应类型

// 会话相关响应
export interface SessionDTO {
	id: string;
	name: string;
	status: SessionStatus;
	config?: Record<string, unknown>;
	qrCode?: string;
	error?: string;
	updatedAt?: string;
	createdAt?: string;
	apiKey?: string;
}

export interface SessionInfo {
	id: string;
	name: string;
	me?: MyProfile;
	assignedWorker?: string;
	status: SessionStatus;
	config: Record<string, unknown>;
	qrCode?: string;
	error?: string;
	updatedAt?: string;
	createdAt: string;
}

export type SessionStatus =
	| "STARTING"
	| "RUNNING"
	| "STOPPED"
	| "ERROR"
	| "SCAN_QR_CODE"
	| "WORKING";

// 用户信息相关响应
export interface MyProfile {
	id: string;
	name?: string;
	pushName?: string;
	phoneNumber?: string;
	status?: string;
	pictureUrl?: string;
}

// 消息响应
export interface WAMessage {
	id: string;
	timestamp: number;
	fromMe: boolean;
	author?: string;
	chatId?: string;
	type?: string;
	body: string;
	from?: string;
	to?: string;
	source?: string;
	hasMedia?: boolean;
	media?: {
		mimetype: string;
		data?: string;
		filename?: string;
	} | null;
	caption?: string;
	quotedMsg?: WAMessage;
	mentionedIds?: string[];
	ack?: number;
	ackName?: string;
	vCards?: string[];
	_data?: Record<string, unknown>;
	location?: {
		latitude: number;
		longitude: number;
		name?: string;
		address?: string;
	};
	buttons?: {
		id: string;
		text: string;
	}[];
	list?: {
		title: string;
		description: string;
		buttonText: string;
		sections: {
			title: string;
			rows: {
				id: string;
				title: string;
				description?: string;
			}[];
		}[];
	};
	poll?: {
		name: string;
		options: string[];
	};
	vcard?: {
		name: string;
		number: string;
	};
}

// Webhook响应
export interface WebhookNotification {
	id: string;
	event: string;
	session: string;
	timestamp: number;
	metadata?: Record<string, string>;
	me?: {
		id: string;
		pushName: string;
	};
	payload: WAMessage | { status: SessionStatus } | Record<string, unknown>;
	engine?: string;
	environment?: {
		version: string;
		engine: string;
		tier: string;
		browser: string;
	};
}
