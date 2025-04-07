import { mastraApi } from "@/lib/mastra-api";
import { auth } from "@/server/auth";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		// Check authentication
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Parse request body
		const body = await req.json();
		const { messages, agentId = "weatherAgent" } = body;

		if (!messages || !Array.isArray(messages)) {
			return NextResponse.json(
				{ error: "Invalid request: messages array is required" },
				{ status: 400 },
			);
		}

		// Create threadId if not exist
		const threadId = `thread-${Date.now()}`;

		// Format request for Mastra API
		const requestData = {
			messages,
			threadId,
			resourceId: `chat-${Date.now()}`,
		};

		// Generate response using Mastra API
		const response = await mastraApi.agents.generate(agentId, requestData);

		return NextResponse.json(response);
	} catch (error) {
		console.error("Chat API error:", error);
		return NextResponse.json(
			{ error: `Failed to process chat: ${(error as Error).message}` },
			{ status: 500 },
		);
	}
}
