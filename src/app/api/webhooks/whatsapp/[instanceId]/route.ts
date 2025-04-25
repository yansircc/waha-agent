import type { WAMessage, WebhookNotification } from "@/types/api-responses";
import { type NextRequest, NextResponse } from "next/server";
import {
	determineOtherPartyId,
	handleChatHistory,
	identifyAndSaveBotPhoneNumber,
} from "./helpers";
import { handleOtherMessage } from "./other-message-handler";
import { handleSelfMessage } from "./self-message-handler";
import {
	isMessageEvent,
	isSelfToSelfMessage,
	validateMessageData,
	validateWebhook,
} from "./utils";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ instanceId: string }> },
) {
	// 解析URL参数中的实例ID
	const { instanceId } = await params;

	try {
		// 解析请求体
		const body = (await request.json()) as WebhookNotification;

		// 验证webhook有效性
		const { isValid, errorMessage } = validateWebhook(body);
		if (!isValid) {
			console.log("接收到无效的webhook数据");
			return NextResponse.json({
				success: false,
				error: errorMessage,
			});
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

		// 确保session存在
		const session = body.session || "default";

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
		const botPhoneNumber = await identifyAndSaveBotPhoneNumber(
			instanceId,
			messageData,
			session,
		);

		// 确定另一方的ID (对方ID，而不是自己的ID)
		const otherPartyId = determineOtherPartyId(messageData);

		// 跳过处理机器人自己发给自己的消息
		if (isSelfToSelfMessage(messageData, botPhoneNumber)) {
			console.log("跳过处理机器人自己发给自己的消息");
			return NextResponse.json({
				success: true,
				ignored: true,
				reason: "机器人自己发给自己的消息",
			});
		}

		// 将消息添加到聊天历史记录
		if (otherPartyId) {
			await handleChatHistory(instanceId, session, messageData, otherPartyId);
		}

		// 根据消息来源进行不同处理
		if (messageData.fromMe) {
			// 处理自己发送的消息
			const result = await handleSelfMessage(instanceId, messageData);
			return NextResponse.json(result);
		}

		// 处理他人发送的消息
		const result = await handleOtherMessage(
			instanceId,
			session,
			messageData,
			body,
			botPhoneNumber,
		);
		return NextResponse.json(result);
	} catch (e) {
		// 捕获JSON解析或其他顶级错误
		console.error(
			`处理webhook时发生错误: ${e instanceof Error ? e.message : String(e)}`,
		);
		return NextResponse.json({
			success: false,
			error: "处理webhook时发生错误",
		});
	}
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
