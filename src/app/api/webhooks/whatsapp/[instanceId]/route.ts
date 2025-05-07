import type { WAMessage, WebhookNotification } from "@/types/api-responses";
import { type NextRequest, NextResponse } from "next/server";
import { catchError } from "react-catch-error";
import {
	determineOtherPartyId,
	handleChatHistory,
	identifyAndSaveBotPhoneNumber,
} from "./helpers";
import { handleOtherMessage } from "./other-message-handler";
import { handleSelfMessage } from "./self-message-handler";
import { handleSessionEvent } from "./session-event-handler";
import {
	isMessageEvent,
	isSelfToSelfMessage,
	isSessionEvent,
	validateMessageData,
	validateWebhook,
} from "./utils";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ instanceId: string }> },
) {
	// 解析URL参数中的实例ID
	const { error: paramsError, data: paramsData } = await catchError(
		async () => {
			const { instanceId } = await params;
			return { instanceId };
		},
	);
	if (paramsError || !paramsData) {
		console.error("参数解析失败:", paramsError);
		return NextResponse.json({
			success: false,
			error: "Invalid instanceId parameter",
		});
	}
	const { instanceId } = paramsData;

	const { error: bodyError, data: body } = await catchError(async () => {
		const body = await request.json();
		return body as WebhookNotification;
	});
	if (bodyError || !body) {
		console.error("请求体解析失败:", bodyError);
		return NextResponse.json({ success: false, error: "Invalid JSON body" });
	}

	// 验证webhook有效性
	const { isValid, errorMessage } = validateWebhook(body);
	if (!isValid) {
		console.log("接收到无效的webhook数据");
		return NextResponse.json({
			success: false,
			error: errorMessage,
		});
	}

	// 确保session存在
	const session = body.session || "default";

	// 检查是否为会话事件
	if (isSessionEvent(body.event)) {
		const { error: sessionError, data: sessionResult } = await catchError(
			async () => handleSessionEvent(instanceId, body),
		);
		if (sessionError || !sessionResult) {
			console.error("处理会话事件失败:", sessionError);
			return NextResponse.json({
				success: false,
				error: "Failed to handle session event",
			});
		}
		return NextResponse.json(sessionResult);
	}

	// 检查是否为消息事件
	const { isMessage, reason } = isMessageEvent(body);
	if (!isMessage) {
		// 非消息事件，不处理，直接返回成功
		return NextResponse.json({
			success: true,
			ignored: true,
			reason,
		});
	}

	// 解析消息数据
	const messageData = body.payload as Partial<WAMessage>;

	// 验证消息数据
	const validationResult = validateMessageData(messageData);
	if (!validationResult.isValid) {
		console.log(validationResult.errorMessage);
		return NextResponse.json({
			success: false,
			error: validationResult.errorMessage,
		});
	}

	const chatId = validationResult.chatId as string;

	// 动态识别机器人的电话号码
	const { error: botError, data: botPhoneNumber } = await catchError(async () =>
		identifyAndSaveBotPhoneNumber(instanceId, messageData, session),
	);
	if (botError) {
		console.error("识别机器人号码失败:", botError);
	}

	// 确定另一方的ID (对方ID，而不是自己的ID)
	const otherPartyId = determineOtherPartyId(messageData);

	// 跳过处理机器人自己发给自己的消息
	if (isSelfToSelfMessage(messageData)) {
		console.log("跳过处理机器人自己发给自己的消息");
		return NextResponse.json({
			success: true,
			ignored: true,
			reason: "机器人自己发给自己的消息",
		});
	}

	// 将消息添加到聊天历史记录
	if (otherPartyId) {
		const { error: historyError } = await catchError(async () =>
			handleChatHistory(instanceId, session, messageData, otherPartyId),
		);
		if (historyError) {
			console.error("添加聊天历史失败:", historyError);
		}
	}

	// 根据消息来源进行不同处理
	if (messageData.fromMe) {
		const { error: selfError, data: result } = await catchError(async () =>
			handleSelfMessage(instanceId, messageData),
		);
		if (selfError || !result) {
			console.error("处理自己消息失败:", selfError);
			return NextResponse.json({
				success: false,
				error: "Failed to handle self message",
			});
		}
		return NextResponse.json(result);
	}

	// 处理他人发送的消息
	const safeBotPhoneNumber = botPhoneNumber ?? null;
	const { error: otherError, data: result } = await catchError(async () =>
		handleOtherMessage(
			instanceId,
			session,
			messageData,
			body,
			safeBotPhoneNumber,
		),
	);
	if (otherError || !result) {
		console.error("处理他人消息失败:", otherError);
		return NextResponse.json({
			success: false,
			error: "Failed to handle other message",
		});
	}
	return NextResponse.json(result);
}

// 处理OPTIONS请求以支持CORS预检
export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Allow-Origin": "*",
		},
	});
}
