import { cohere } from "@ai-sdk/cohere";
import { openai } from "@ai-sdk/openai";
import { embed, generateText, tool } from "ai";
import { z } from "zod";
import { reranker } from "./jina-reranker";
import { qdrantService } from "./qdrant-service";
import { sendEmail } from "./send-email";
import { sendWahaMessageWithUrl } from "./send-waha-message";

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
		// 1. Generate embedding for the query
		const { embedding } = await embed({
			model: cohere.embedding("embed-multilingual-v3.0"),
			value: query,
		});

		if (!embedding) {
			throw new Error("Failed to generate query embedding");
		}

		// 2. Search in Qdrant using qdrantService
		const initialResults = await qdrantService.search("waha", {
			// Updated collection name and options
			vector: embedding,
			limit: 10, // Use limit instead of topK
			filter: {
				should: kbIds.map((kbId) => ({
					key: "kbId",
					match: {
						value: kbId,
					},
				})),
			},
		});

		// Ensure initialResults is an array before checking length
		if (!Array.isArray(initialResults) || initialResults.length === 0) {
			// Updated check
			console.log("No initial results found in Qdrant.");
			return { results: [] }; // Return an object with a results array
		}

		// 3. Rerank results
		// Extract content from results assuming it's in payload.text
		const documentsToRerank = initialResults
			.map((r) => {
				// Ensure payload and text exist and are strings
				if (r.payload && typeof r.payload.text === "string") {
					return r.payload.text;
				}
				console.warn(`Result with id ${r.id} missing payload.text`);
				return ""; // Return empty string for missing content
			})
			.filter((content) => content !== ""); // Filter out empty strings if necessary

		if (documentsToRerank.length === 0) {
			console.log("No valid documents found in initial results for reranking.");
			return { results: [] };
		}

		const rerankedResults = await reranker(query, documentsToRerank); // Pass extracted content

		// Cherrypick the top N results based on reranker output
		// Ensure rerankedResults.results is an array and contains objects with an 'index' property
		if (!rerankedResults?.results || !Array.isArray(rerankedResults.results)) {
			console.error("Reranker did not return expected results structure.");
			return { results: [] };
		}

		// Map reranked indices back to the original initialResults
		const results = rerankedResults.results.map((r) => initialResults[r.index]);

		return { results }; // Return an object with the final results array
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
		const { success, error } = await sendEmail(to, subject, body);
		if (!success) {
			throw new Error(error);
		}
		return { success, error };
	},
});

// Send Waha message tool
const sendWahaMessageTool = tool({
	description: "Send a WhatsApp message to the user.",
	parameters: z.object({
		chatId: z.string().describe("The WhatsApp chat ID of the recipient."),
		text: z.string().describe("The message to send."),
	}),
	execute: async ({ chatId, text }) => {
		const { success, error } = await sendWahaMessageWithUrl(chatId, text);
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
			sendWahaMessageTool,
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
