import { auth } from "@/server/auth";
import { agentChat } from "@/trigger/agent-chat";
import type { AgentChatPayload } from "@/trigger/types";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const session = await auth();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = (await request.json()) as AgentChatPayload;

	if (body satisfies AgentChatPayload) {
		try {
			await agentChat.trigger({ ...body });

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
