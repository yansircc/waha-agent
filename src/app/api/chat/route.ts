import { db } from "@/server/db";
import { openai } from "@ai-sdk/openai";
import { type CoreMessage, generateText } from "ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { messages, agentId }: { messages: CoreMessage[]; agentId?: string } =
			await req.json();

		// 如果提供了代理ID，获取代理信息并使用它的提示
		let systemPrompt = "You are a helpful assistant.";

		if (agentId) {
			try {
				// 从数据库获取代理信息
				const agent = await db.query.agents.findFirst({
					where: (agent, { eq }) => eq(agent.id, agentId),
				});

				if (agent) {
					systemPrompt = agent.prompt;
					console.log(`Using agent ${agent.name} with custom prompt`);
				} else {
					console.warn(
						`Agent with ID ${agentId} not found, using default prompt`,
					);
				}
			} catch (error) {
				console.error("Error fetching agent:", error);
				// 继续使用默认提示
			}
		}

		const { text } = await generateText({
			model: openai("gpt-4o-mini"),
			system: systemPrompt,
			messages,
		});

		return NextResponse.json({ text });
	} catch (error) {
		console.error("Error in chat API:", error);
		return NextResponse.json(
			{ error: "Failed to process your request" },
			{ status: 500 },
		);
	}
}
