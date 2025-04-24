import { env } from "@/env";
import {
	getChatAgentActive,
	getInstanceAgent,
	setChatAgentActive,
} from "@/lib/instance-redis";
import { wahaApi } from "@/lib/waha-api";
import { whatsAppChat } from "@/trigger/waha-chat";
import type { WAMessage, WebhookNotification } from "@/types/api-responses";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ instanceId: string }> },
) {
	// 解析URL参数中的实例ID
	const { instanceId } = await Promise.resolve(params);

	try {
		// 解析请求体
		const body = (await request.json()) as WebhookNotification;

		// 创建回调URL
		const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp/${instanceId}`;

		// 确保body有效，防止错误
		if (!body || typeof body !== "object") {
			console.log("接收到无效的webhook数据");
			return NextResponse.json({
				success: false,
				error: "Invalid webhook data",
			});
		}

		// 只处理消息类型的webhook
		if (!body.event || !body.event.startsWith("message")) {
			// 非消息事件或缺少event字段，不处理，直接返回成功
			return NextResponse.json({
				success: true,
				ignored: true,
				reason: body.event ? "非消息事件" : "缺少event字段",
			});
		}

		// 确保session存在
		const session = body.session || "default";

		// 解析消息数据
		const messageData = body.payload as Partial<WAMessage>;
		if (!messageData) {
			console.log("消息数据为空");
			return NextResponse.json({ success: false, error: "Empty message data" });
		}

		// 获取聊天ID
		const chatId = messageData.from || messageData.chatId || "";
		if (!chatId) {
			console.log("消息缺少必要的chatId字段，无法处理");
			return NextResponse.json({ success: true, error: "Missing chatId" });
		}

		// 处理自己发送的消息
		if (messageData.fromMe) {
			console.log(`检测到自己在聊天 ${chatId} 中发送的消息`);

			// 获取消息内容
			const messageContent = messageData.body || "";
			if (!messageContent) {
				return NextResponse.json({ success: true });
			}

			// 获取对话方ID (当fromMe为true时，to字段包含对话方ID)
			const recipientId = messageData.to || "";
			if (!recipientId) {
				console.log("无法获取对话方ID，跳过控制设置");
				return NextResponse.json({ success: true });
			}

			// 检查消息是否以特定字符结尾，用于控制AI回复状态
			if (messageContent.endsWith(",")) {
				// 逗号结尾，禁用当前聊天的AI回复
				await setChatAgentActive(instanceId, recipientId, false);
				console.log(`已禁用与 ${recipientId} 的聊天AI回复`);
				return NextResponse.json({
					success: true,
					action: "ai_disabled",
					chatId: recipientId,
				});
			}
			if (messageContent.endsWith(".")) {
				// 句号结尾，启用当前聊天的AI回复
				await setChatAgentActive(instanceId, recipientId, true);
				console.log(`已启用与 ${recipientId} 的聊天AI回复`);
				return NextResponse.json({
					success: true,
					action: "ai_enabled",
					chatId: recipientId,
				});
			}

			// 其他自己发送的消息，不做处理
			return NextResponse.json({ success: true });
		}

		// 处理其他人发送的消息
		try {
			// 获取消息内容
			const messageContent = messageData.body || "";

			if (!messageContent) {
				console.log("消息缺少必要字段，无法处理");
				return NextResponse.json({ success: true });
			}

			console.log(`收到来自 ${chatId} 的消息: ${messageContent}`);

			// 从Redis获取代理配置
			const agentFromRedis = await getInstanceAgent(instanceId);

			// 检查此聊天是否启用了AI回复
			const isChatActive = await getChatAgentActive(instanceId, chatId);

			// 记录日志
			if (agentFromRedis) {
				if (isChatActive) {
					console.log(
						`与 ${chatId} 的聊天已启用AI回复，将使用代理 ID: ${agentFromRedis.id}`,
					);
				} else {
					console.log(`与 ${chatId} 的聊天已禁用AI回复，跳过处理`);
					return NextResponse.json({
						success: true,
						aiStatus: "inactive",
						chatId,
					});
				}
			} else {
				console.log(`实例 ${instanceId} 没有关联的代理配置，将使用默认回复`);
			}

			// 触发AI处理任务
			const triggerResult = await whatsAppChat.trigger({
				session,
				webhookData: body,
				instanceId,
				webhookUrl,
				// 只在代理存在且聊天已启用AI时提供
				agent: agentFromRedis && isChatActive ? agentFromRedis : undefined,
			});

			console.log("已触发WhatsApp消息处理", {
				triggerId: triggerResult.id,
				status: "pending",
				chatId,
				usingAgent: !!(agentFromRedis && isChatActive),
			});

			// 立即返回成功响应，让trigger.dev在后台处理
			return NextResponse.json({
				success: true,
				chatId,
				message: "已接收webhook，正在后台处理",
			});
		} catch (error) {
			// 记录错误但仍然返回成功响应
			// WhatsApp webhook需要快速响应，即使处理失败也不应该返回错误
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(`触发WhatsApp消息处理失败: ${errorMessage}`);

			// 如果触发失败，尝试手动处理消息以确保用户收到响应
			try {
				if (chatId) {
					await wahaApi.chatting.sendText({
						session,
						chatId,
						text: "很抱歉，我目前遇到了技术问题，请稍后再试。",
						linkPreview: false,
					});
				}
			} catch (innerError) {
				console.error("发送故障回复失败:", innerError);
			}

			// 仍然返回成功以告知WhatsApp已收到webhook
			return NextResponse.json({ success: true, chatId, error: "处理错误" });
		}
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
