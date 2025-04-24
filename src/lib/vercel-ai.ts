import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";
import { qdrantService } from "./qdrant-service";
import { sendEmail } from "./send-email";

// Define the search tool using Vercel AI SDK's tool function
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

			console.log("query", query);
			console.log("kbIds", kbIds);
			console.log("searchResults", searchResults);

			// 返回搜索结果
			return searchResults;
		} catch (error) {
			console.error("Knowledge base search error:", error);
			return { results: [] };
		}
	},
});

// Send email tool
const sendEmailTool = tool({
	description: "Send an email to the user.",
	parameters: z.object({
		to: z.string().describe("The email address of the recipient."),
		subject: z.string().describe("The subject of the email."),
		body: z.string().describe("The body of the email."),
	}),
	execute: async ({ to, subject, body }) => {
		const { success, error } = await sendEmail({ to, subject, body });
		if (!success) {
			throw new Error(error);
		}
		return { success, error };
	},
});

export interface VercelAIAgentPayload {
	messages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	userId: string;
	kbIds: string[];
}

export const vercelAIAgent = async (payload: VercelAIAgentPayload) => {
	const result = await generateText({
		model: openai("gpt-4o"),
		messages: payload.messages,
		tools: {
			searchKnowledgeBase,
			sendEmailTool,
		},
		maxSteps: 10,
		system: `You are a WhatsApp user trying to pass the Turing test by answering questions as accurately as possible.

When you encounter a question you cannot answer:
1. Use the searchKnowledgeBase tool to find relevant content. The tool requires a rewritten, specific, and professional query based on the user's question, and also need to pass the kbId(${payload.kbIds}).
2. Analyze the retrieved information ('results' array in the tool output) carefully.
3. Provide clear, concise answers based *only* on the retrieved content.
4. If the information is not found in the tool results or the results are empty, respond exactly with "Sorry, I don't know." Do not add any other explanation.
5. Always maintain context between user messages.

Remember to:
- Act like a real WhatsApp user.
- Admit when you need more information *before* calling the tool if the query is unclear.
- If the tool returns results, base your answer strictly on those results.`,
	});

	return result;
};
