import { wahaApi } from "@/lib/waha-api";
import { db } from "@/server/db";
import type { WAMessage, WebhookNotification } from "@/types/api-responses";
import type { MastraMessage } from "@/types/mastra-types";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	// 确保通过 Promise.resolve() 解析 params 对象
	const { userId } = await Promise.resolve(params);

	// 获取请求体
	const body = (await request.json()) as WebhookNotification;

	// console.log(`接收到WhatsApp webhook事件，用户ID: ${userId}`, body);

	// 根据事件类型处理
	if (body.event.startsWith("message")) {
		// 处理任何类型的消息事件
		const messageData = body.payload as Partial<WAMessage>;

		// 忽略自己发送的消息，避免无限循环
		if (messageData.fromMe) {
			console.log("忽略自己发送的消息，避免循环");
			return NextResponse.json({ success: true });
		}

		try {
			// 获取聊天ID和消息内容
			const chatId = messageData.from || messageData.chatId || "";
			const messageContent = messageData.body || "";

			if (!chatId || !messageContent) {
				console.log("消息缺少必要字段，无法处理");
				return NextResponse.json({ success: true });
			}

			console.log(`收到来自 ${chatId} 的消息: ${messageContent}`);

			// 查找该用户的活跃代理
			const activeAgent = await db.query.agents.findFirst({
				where: (agent, { eq, and }) =>
					and(eq(agent.createdById, userId), eq(agent.isActive, true)),
			});

			// 从 Mastra API 获取 agentId，默认使用 weatherAgent
			// const mastraAgentId = activeAgent?.id || "weatherAgent";
			const mastraAgentId = "weatherAgent"; //TODO: 测试用

			// 创建消息格式
			const messages: MastraMessage[] = [
				{
					role: "user",
					content: messageContent,
				},
			];

			// 创建包含用户ID的threadId和 resourceId
			const threadId = `user-${userId}-${chatId}`;
			const resourceId = `whatsapp-${chatId}`;

			// 调用 Mastra API 生成回复
			const response = { text: "Hello, how can I help you today?" };

			// 从响应中获取生成的文本
			const aiResponse = response.text;

			console.log(`AI回复: ${aiResponse}`);

			// 通过WhatsApp API发送回复，使用更新后的请求格式
			await wahaApi.chatting.sendText({
				session: body.session,
				chatId: chatId,
				text: aiResponse,
				linkPreview: true,
				// 如果消息中有ID，我们可以回复它
				reply_to: messageData.id || null,
			});

			console.log("已发送AI回复");
		} catch (error) {
			// 更详细的错误日志
			console.error("处理消息或发送回复失败:", error);
		}
	} else if (body.event === "session.status") {
		// 处理会话状态变化
		const statusData = body.payload as { status: string };
		console.log(`会话状态变更: ${body.session} => ${statusData.status}`);

		// 可以在这里更新实例状态
	}

	// 返回成功响应
	return NextResponse.json({ success: true });
}

// 可选: 处理OPTIONS请求以支持CORS预检
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
