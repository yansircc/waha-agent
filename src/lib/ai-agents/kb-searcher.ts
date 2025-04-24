import type { Agent } from "@/types/agents";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";
import { qdrantService } from "../qdrant-service";

const searchKnowledgeBase = tool({
	description:
		"Search through the knowledge base to find relevant information.",
	parameters: z.object({
		query: z
			.string()
			.describe(
				"The search query to find relevant information. Rewrite the query to be more specific and professional if necessary.",
			),
		kbIds: z
			.array(z.string().describe("The IDs of the knowledge bases to search."))
			.describe("The IDs of the knowledge bases to search."),
	}),
	execute: async ({ query, kbIds }) => {
		try {
			// 使用通用hybridSearch方法，传入多个知识库ID
			// 在AI Agent场景中，使用should条件匹配任意知识库
			const searchResults = await qdrantService.hybridSearch(query, kbIds, {
				limit: 5,
				scoreNormalization: "percentage",
				candidateMultiplier: 2,
				useShould: true, // 多知识库模式
			});

			// 返回搜索结果
			return searchResults;
		} catch (error) {
			console.error("Knowledge base search error:", error);
			return { results: [] };
		}
	},
});

export interface KbSearcherPayload {
	agent: Agent;
	messages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
}

export const kbSearcher = async (payload: KbSearcherPayload) => {
	const openai = createOpenAI({
		apiKey: payload.agent.apiKey,
		baseURL: "https://aihubmix.com/v1",
	});

	const result = await generateText({
		model: openai(payload.agent.model),
		messages: payload.messages,
		tools: {
			searchKnowledgeBase,
		},
		maxSteps: 3,
		system: `${payload.agent.prompt}
When you encounter a question you cannot answer, use the searchKnowledgeBase tool to find relevant content.
The tool requires a rewritten, specific, and professional query based on the user's question, and also need to pass the kbIds(${payload.agent.kbIds}).
If the tool returns results, base your answer strictly on those results.`,
	});

	return result;
};
