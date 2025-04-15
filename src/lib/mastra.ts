import { env } from "@/env";
import { MastraClient } from "@mastra/client-js";

export const mastraClient = new MastraClient({
	baseUrl: env.MASTRA_API_URL,
});

// import { env } from "@/env";
// import { cohere } from "@ai-sdk/cohere";
// import { openai } from "@ai-sdk/openai";
// import { Mastra, createTool } from "@mastra/core";
// import { Agent } from "@mastra/core/agent";
// import { QdrantVector } from "@mastra/qdrant";
// import { rerank } from "@mastra/rag";
// import { embed } from "ai";
// import { z } from "zod";

// // Initialize Qdrant client
// const qdrant = new QdrantVector(env.QDRANT_URL, env.QDRANT_API_KEY);

// // Define input and output schemas
// const searchInputSchema = z.object({
// 	query: z
// 		.string()
// 		.describe(
// 			"The search query to find relevant information, you need to rewrite the query to be more specific and professional",
// 		),
// });

// const searchOutputSchema = z.array(z.string().describe("The search results"));

// // Create a search tool
// const searchTool = createTool({
// 	id: "searchKnowledgeBase",
// 	description: "Search through the knowledge base to find relevant information",
// 	inputSchema: searchInputSchema,
// 	outputSchema: searchOutputSchema,
// 	execute: async ({ context }) => {
// 		// 1. Generate embedding for the query
// 		const { embedding } = await embed({
// 			value: context.query,
// 			model: cohere.embedding("embed-multilingual-v3.0"),
// 		});

// 		if (!embedding) {
// 			throw new Error("Failed to generate query embedding");
// 		}

// 		// 2. Search in Qdrant
// 		const initialResults = await qdrant.query({
// 			indexName: "waha",
// 			queryVector: embedding,
// 			topK: 10, // Get more results for reranking
// 		});

// 		if (!initialResults?.length) {
// 			return [];
// 		}

// 		// 3. Rerank results
// 		const rerankedResults = await rerank(
// 			initialResults,
// 			context.query,
// 			openai("gpt-4o-mini"),
// 			{
// 				topK: 3,
// 			},
// 		);

// 		const results = rerankedResults.map(
// 			(data) => data.result?.metadata?.text,
// 		) as string[];

// 		return results;
// 	},
// });

// // Create the RAG agent
// const ragAgent = new Agent({
// 	name: "RAG Assistant",
// 	model: openai("gpt-4o-mini"),
// 	tools: { searchKnowledgeBase: searchTool },
// 	instructions: `You are a WhatsApp user trying to pass the Turing test by answering questions as accurately as possible.

// When you encounter a question you cannot answer:
// 1. Use the searchKnowledgeBase tool to find relevant content
// 2. Analyze the retrieved information carefully
// 3. Provide clear, concise answers based on the retrieved content
// 4. If the information is not found or unclear, be honest about it
// 5. Always maintain context between user messages

// Remember to:
// - Act like a real WhatsApp user
// - Admit when you need more information
// `,
// });

// export const mastra = new Mastra({
// 	agents: {
// 		ragAgent,
// 	},
// });
