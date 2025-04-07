import { mastra } from "@/mastra";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
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
		const { messages, agentId } = body;

		if (!messages || !Array.isArray(messages)) {
			return NextResponse.json(
				{ error: "Invalid request: messages array is required" },
				{ status: 400 },
			);
		}

		// 默认使用研究型agent
		const mastraAgentId = "researchAgent";

		// 如果提供了agentId，验证并获取agent信息
		if (agentId) {
			// 从数据库查询agent
			const userAgent = await db.query.agents.findFirst({
				where: (agent, { eq, and }) =>
					and(eq(agent.id, agentId), eq(agent.createdById, session.user.id)),
			});

			if (!userAgent) {
				return NextResponse.json(
					{ error: "Agent not found or you don't have permission to use it" },
					{ status: 404 },
				);
			}
		}

		// 获取最后一条消息作为查询内容
		const lastMessage = messages[messages.length - 1];
		if (!lastMessage || !lastMessage.content) {
			return NextResponse.json(
				{ error: "Invalid request: message content is required" },
				{ status: 400 },
			);
		}

		// 直接使用mastra库生成回复
		const mastraAgent = mastra.getAgent(mastraAgentId);
		const response = await mastraAgent.generate(lastMessage.content);

		return NextResponse.json({
			response: response.text,
			messages: [...messages, { role: "assistant", content: response.text }],
		});
	} catch (error) {
		console.error("Chat API error:", error);
		return NextResponse.json(
			{ error: `Failed to process chat: ${(error as Error).message}` },
			{ status: 500 },
		);
	}
}
