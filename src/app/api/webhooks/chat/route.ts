import { type NextRequest, NextResponse } from "next/server";

/**
 * 聊天生成 Webhook 端点
 *
 * 接收来自 Trigger.dev 的聊天生成结果通知
 */
export async function POST(req: NextRequest) {
	try {
		const data = await req.json();
		const {
			success,
			response,
			messages,
			error,
			userId,
			agentId,
			conversationId,
		} = data;

		if (!success) {
			console.error(`Chat generation failed for user ${userId}:`, error);
			return NextResponse.json({ success: false, error }, { status: 500 });
		}

		// 验证必要数据是否存在
		if (!response || !messages || !userId) {
			return NextResponse.json(
				{ success: false, error: "Missing required data" },
				{ status: 400 },
			);
		}

		console.log(
			`Chat generation completed for user ${userId} with agent ${agentId || "default"}, response: ${JSON.stringify(response)}`,
		);

		// 这里可以添加将会话保存到数据库的逻辑（如果需要）

		return NextResponse.json({
			success: true,
			message: "Chat response generated successfully",
			response,
			messages,
		});
	} catch (error) {
		console.error("Error processing webhook:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
