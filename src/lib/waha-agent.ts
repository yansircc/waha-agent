import { env } from "@/env";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, tool } from "ai";
import { z } from "zod";

interface CreateAgentOptions {
	apiKey: string;
	model: string;
	prompt: string;
	documentId: string;
}

export const wahaAgent = async (options: CreateAgentOptions) => {
	const provider = createOpenRouter({
		apiKey: options.apiKey,
	});

	const result = await generateText({
		model: provider.languageModel(options.model),
		tools: {
			searchDocuments: tool({
				description: "Search for information in documents using AutoRAG",
				parameters: z.object({
					query: z
						.string()
						.describe("The search query to find relevant information"),
				}),
				execute: async ({ query }) => {
					try {
						const response = await fetch(env.NEXT_PUBLIC_AUTORAG_API_URL, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${env.AUTORAG_API_KEY}`,
							},
							body: JSON.stringify({
								query,
								rewrite_query: true,
								max_num_results: 10,
								ranking_options: {
									score_threshold: 0.5,
								},
							}),
						});

						const data = await response.json();

						if (!data.success) {
							return {
								success: false,
								message: "Failed to retrieve information from documents",
							};
						}

						return {
							success: true,
							response: data.result.response,
							documents: data.result.data || [],
							searchQuery: data.result.search_query,
						};
					} catch (error) {
						return {
							success: false,
							message:
								error instanceof Error
									? error.message
									: "Unknown error occurred",
						};
					}
				},
			}),
		},
		prompt: options.prompt,
	});

	// If AI used the search tool, return the tool result
	const searchToolResult = result.toolResults.find(
		(tool) => tool.toolName === "searchDocuments",
	);

	if (searchToolResult?.result) {
		return searchToolResult.result;
	}

	// If AI responded with direct text (didn't use tools)
	if (result.text) {
		return {
			success: true,
			response: result.text,
			documents: [],
			searchQuery: options.prompt,
		};
	}

	// Return a formatted error if no results found
	return {
		success: false,
		message: "No response generated",
		response: null,
		documents: [],
		searchQuery: options.prompt,
	};
};
