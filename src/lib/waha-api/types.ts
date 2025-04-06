// Common type definitions for the WAHA API

export interface SessionInfo {
	id: string;
	name: string;
	status:
		| "STARTING"
		| "RUNNING"
		| "STOPPED"
		| "ERROR"
		| "SCAN_QR_CODE"
		| "WORKING";
	config: Record<string, unknown>;
	qrCode?: string;
	error?: string;
	updatedAt?: string;
	createdAt: string;
}

export interface MeInfo {
	id: string;
	pushname: string;
	name?: string;
	phoneNumber: string;
	profilePictureUrl?: string;
}

export interface SessionCreateRequest {
	name?: string;
	config?: Record<string, unknown>;
	start?: boolean;
}

export interface SessionUpdateRequest {
	config?: Record<string, unknown>;
}

export interface SessionDTO {
	id: string;
	name: string;
	status:
		| "STARTING"
		| "RUNNING"
		| "STOPPED"
		| "ERROR"
		| "SCAN_QR_CODE"
		| "WORKING";
	config: Record<string, unknown>;
}

export interface SessionStartDeprecatedRequest {
	name?: string;
	config?: Record<string, unknown>;
}

export interface SessionStopDeprecatedRequest {
	name?: string;
	logout?: boolean;
}

export interface SessionLogoutDeprecatedRequest {
	name?: string;
}

export interface Base64File {
	mimetype: string;
	data: string;
}

export interface QRCodeValue {
	code: string;
}

export interface RequestCodeRequest {
	phoneNumber: string;
	method?: "sms" | "call";
}

// Profile related interfaces
export interface MyProfile {
	id: string;
	name?: string;
	pushname: string;
	phoneNumber: string;
	status?: string;
	pictureUrl?: string;
}

export interface ProfileNameRequest {
	name: string;
}

export interface ProfileStatusRequest {
	status: string;
}

export interface ProfilePictureRequest {
	file: Base64File;
}

export interface Result {
	success: boolean;
	message?: string;
}

// Chatting related interfaces
export interface MessageTextRequest {
	session?: string;
	chatId: string;
	text: string;
	quotedMessageId?: string;
	mentionedIds?: string[];
}

export interface MessageImageRequest {
	session?: string;
	chatId: string;
	caption?: string;
	text?: string; // Alias for caption
	file?: Base64File;
	url?: string;
	quotedMessageId?: string;
	mentionedIds?: string[];
}

export interface MessageFileRequest {
	session?: string;
	chatId: string;
	caption?: string;
	text?: string; // Alias for caption
	file?: Base64File;
	url?: string;
	quotedMessageId?: string;
}

export interface MessageVoiceRequest {
	session?: string;
	chatId: string;
	file?: Base64File;
	url?: string;
	quotedMessageId?: string;
}

export interface MessageVideoRequest {
	session?: string;
	chatId: string;
	caption?: string;
	text?: string; // Alias for caption
	file?: Base64File;
	url?: string;
	quotedMessageId?: string;
	mentionedIds?: string[];
}

export interface SendButtonsRequest {
	session?: string;
	chatId: string;
	buttons: Button[];
	text: string;
	footer?: string;
	quotedMessageId?: string;
}

export interface Button {
	id: string;
	text: string;
}

export interface MessageForwardRequest {
	session?: string;
	chatId: string;
	messageId: string;
}

export interface SendSeenRequest {
	session?: string;
	chatId: string;
}

export interface ChatRequest {
	session?: string;
	chatId: string;
}

export interface MessageReactionRequest {
	session?: string;
	messageId: string;
	reaction: string;
}

export interface MessageStarRequest {
	session?: string;
	messageIds: string[];
	star: boolean;
}

export interface MessagePollRequest {
	session?: string;
	chatId: string;
	name: string;
	options: string[];
	quotedMessageId?: string;
}

export interface MessageLocationRequest {
	session?: string;
	chatId: string;
	latitude: number;
	longitude: number;
	title?: string;
	quotedMessageId?: string;
}

export interface MessageLinkPreviewRequest {
	session?: string;
	chatId: string;
	text: string;
	previewUrl: string;
	quotedMessageId?: string;
}

export interface MessageContactVcardRequest {
	session?: string;
	chatId: string;
	contactId: string;
	quotedMessageId?: string;
}

export interface MessageButtonReply {
	session?: string;
	chatId: string;
	messageId: string;
	buttonId: string;
}

export interface MessageReplyRequest {
	session?: string;
	chatId: string;
	messageId: string;
	text: string;
}

export interface WAMessage {
	id: string;
	timestamp: number;
	fromMe: boolean;
	author?: string;
	chatId: string;
	type: string;
	body: string;
	// Additional fields may be present based on the message type
}
