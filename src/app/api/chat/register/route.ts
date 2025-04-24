import { storeUserMessage } from "@/lib/chat-store";
import { type NextRequest, NextResponse } from "next/server";

/**
 * 消息注册API - 为用户消息创建唯一ID并跟踪对话
 */
export async function POST(request: NextRequest) {
	try {
		const { conversationId, message } = await request.json();

		if (!conversationId || !message) {
			return NextResponse.json(
				{ error: "conversationId and message are required" },
				{ status: 400 },
			);
		}

		console.log(
			`[Register API] Registering user message for conversation: ${conversationId}`,
		);

		// 将用户消息存储在对话历史中，并获取消息ID
		const messageId = await storeUserMessage(conversationId, message);

		console.log(`[Register API] Generated messageId: ${messageId}`);

		return NextResponse.json({
			success: true,
			messageId,
			conversationId,
		});
	} catch (error) {
		console.error("[Register API] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to register message",
			},
			{ status: 500 },
		);
	}
}
