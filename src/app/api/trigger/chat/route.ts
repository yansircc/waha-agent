import { auth } from "@/server/auth";
import { type AgentChatPayload, agentChat } from "@/trigger/agent-chat";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const session = await auth();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = (await request.json()) as Omit<AgentChatPayload, "userId">;
	console.log("[Trigger API] Received chat request:", {
		conversationId: body.conversationId,
		messageId: body.messageId,
		agentId: body.agentId,
		kbIds: body.kbIds,
		messagesCount: body.messages?.length,
	});

	if (body satisfies Omit<AgentChatPayload, "userId">) {
		try {
			await agentChat.trigger({ ...body, userId: session.user.id });
			console.log("[Trigger API] Triggered chat generation task successfully");

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("[Trigger API] Error triggering task:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to trigger chat generation task" },
				{ status: 500 },
			);
		}
	} else {
		console.error("[Trigger API] Invalid request body");
		return NextResponse.json(
			{ error: "Invalid request body" },
			{ status: 400 },
		);
	}
}
