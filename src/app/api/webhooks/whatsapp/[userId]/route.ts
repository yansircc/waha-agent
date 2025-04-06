import { db } from "@/server/db";
import { waMessages } from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	request: NextRequest,
	{ params }: { params: { userId: string } },
) {
	const userId = params.userId;

	// 获取请求体
	const body = await request.json();

	console.log(`接收到WhatsApp webhook事件，用户ID: ${userId}`, body);

	// 根据事件类型处理
	if (body.event === "message") {
		// 保存接收到的消息到数据库
		try {
			await db.insert(waMessages).values({
				messageId: body.data.id,
				sessionName: body.session,
				fromMe: body.data.fromMe,
				timestamp: new Date(body.data.timestamp * 1000), // 转换Unix时间戳为Date
				chatId: body.data.chatId,
				type: body.data.type,
				author: body.data.author || "",
				body: body.data.body || "",
				caption: body.data.caption || "",
				userId: userId,
				rawData: JSON.stringify(body),
			});

			console.log(`消息已保存，ID: ${body.data.id}`);
		} catch (error) {
			console.error("保存消息失败:", error);
		}
	} else if (body.event === "session.status") {
		// 处理会话状态变化
		console.log(`会话状态变更: ${body.session} => ${body.data.status}`);

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
