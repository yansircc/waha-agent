import { env } from "@/env";
import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { QdrantClient } from "@qdrant/qdrant-js";
import { generateText, tool } from "ai";
import { z } from "zod";

const qdrant = new QdrantClient({
	url: env.QDRANT_URL,
	apiKey: env.QDRANT_API_KEY,
});

// Function to generate embeddings
async function generateEmbedding(text: string): Promise<number[]> {
	const embedding = openai.embedding("text-embedding-3-small");
	const response = await embedding.doEmbed({
		values: [text],
	});
	return response.embeddings[0] ?? [];
}

interface CreateAgentOptions {
	apiKey: string;
	model: string;
	prompt: string;
	documentId: string;
}

export const wahaAgent = async (options: CreateAgentOptions) => {
	try {
		const provider = createOpenRouter({
			apiKey: options.apiKey,
		});

		// Define the search documents tool
		const searchDocumentsTool = tool({
			description: "Search for information in documents using vector search",
			parameters: z.object({
				query: z
					.string()
					.describe("The search query to find relevant information"),
			}),
			execute: async ({ query }) => {
				try {
					// Generate embedding for the search query
					const queryVector = await generateEmbedding(query);

					// Search in the knowledge_base collection
					const searchResults = await qdrant.search("knowledge_base", {
						vector: queryVector,
						limit: 5,
					});

					if (!searchResults || searchResults.length === 0) {
						return {
							success: false,
							message: "No relevant information found in the knowledge base",
						};
					}

					// Format the search results
					const documents = searchResults.map((result) => {
						// Try to find content in various places in the payload
						let content = "";
						if (result.payload) {
							content =
								(result.payload.content as string) ||
								(result.payload.text as string) ||
								(result.payload.body as string) ||
								"";

							// If metadata contains the content, use that
							const metadata = result.payload.metadata as Record<
								string,
								unknown
							>;
							if (!content && metadata) {
								content =
									(metadata.content as string) ||
									(metadata.text as string) ||
									JSON.stringify(metadata);
							}
						}

						return {
							id: result.id,
							content,
							score: result.score,
						};
					});

					const documentContents = documents
						.filter((doc) => doc.content && doc.content.trim().length > 0)
						.map((doc) => doc.content)
						.join("\n\n");

					return {
						success: true,
						documents,
						documentContents,
						message: `Found ${documents.length} relevant documents.`,
					};
				} catch (error) {
					console.error("Error in search documents tool:", error);
					return {
						success: false,
						message:
							error instanceof Error ? error.message : "Unknown error occurred",
					};
				}
			},
		});

		// Set up a clear system prompt instructing how to use the tool
		const systemPrompt = `You are a helpful assistant that answers questions based on available knowledge.
Follow these instructions carefully:
1. When the user asks a question, consider if you need to search for information
2. Use the searchDocuments tool to look up relevant facts if needed
3. Examine the search results carefully to find the specific answer to the user's query
4. Provide a clear, direct answer based on the information found
5. If the documents contain tables, CSV data, or structured content, interpret it properly
6. If no information is found, honestly state that you don't have the information`;

		// Generate the response using the tool
		const result = await generateText({
			model: provider.languageModel(options.model),
			system: systemPrompt,
			messages: [
				{
					role: "user",
					content: options.prompt,
				},
			],
			tools: {
				searchDocuments: searchDocumentsTool,
			},
			temperature: 0.1, // Lower temperature for more predictable responses
			maxTokens: 800, // Ensure we get a complete response
			maxSteps: 3,
		});

		if (!result.text) {
			// If we have tool results but no response, create a fallback response
			const searchToolResult = result.toolResults.find(
				(tool) => tool.toolName === "searchDocuments",
			);

			if (searchToolResult?.result?.success) {
				return {
					success: true,
					response: `Based on the information I found: ${searchToolResult.result.documentContents || "No specific content available."}`,
					documents: searchToolResult.result.documents || [],
					searchQuery: options.prompt,
				};
			}

			return {
				success: false,
				message: "Could not generate a response or find relevant information",
				response: null,
				documents: [],
				searchQuery: options.prompt,
			};
		}

		// Extract any document references if search tool was used
		const searchToolResult = result.toolResults.find(
			(tool) => tool.toolName === "searchDocuments" && tool.result?.success,
		);

		const documents = searchToolResult?.result?.documents || [];

		// Return the AI's response with any supporting documents
		return {
			success: true,
			response: result.text,
			documents,
			searchQuery: options.prompt,
		};
	} catch (error) {
		console.error("Error in wahaAgent:", error);
		return {
			success: false,
			message:
				error instanceof Error ? error.message : "An unexpected error occurred",
			response: null,
			documents: [],
			searchQuery: options.prompt,
		};
	}
};
