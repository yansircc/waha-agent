import { getResponseByConversationId } from "@/lib/chat-store";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const conversationId = url.searchParams.get("conversationId");
	const messageId = url.searchParams.get("messageId"); // 允许查询特定消息的响应

	if (!conversationId) {
		return NextResponse.json(
			{ error: "conversationId is required" },
			{ status: 400 },
		);
	}

	console.log(
		`[Status API] Checking status for conversation: ${conversationId}, messageId: ${messageId || "latest"}`,
	);

	// 使用存储模块获取响应
	const response = await getResponseByConversationId(
		conversationId,
		messageId || undefined,
	);

	if (!response) {
		console.log(
			`[Status API] No response found for conversation: ${conversationId}${messageId ? `, messageId: ${messageId}` : ""}`,
		);
		return NextResponse.json({ status: "processing" });
	}

	console.log(
		`[Status API] Found response for conversation: ${conversationId}, status: ${response.status}${response.error ? `, error: ${response.error}` : ""}`,
	);

	// 返回找到的响应
	return NextResponse.json(response);
}
