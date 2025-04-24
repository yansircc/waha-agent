import { env } from "@/env";
import { z } from "zod";

interface RerankerResult {
	results: {
		index: number;
		score: number;
	}[];
}

const RerankerResponseSchema = z.object({
	model: z.string(),
	usage: z.object({
		total_tokens: z.number(),
	}),
	results: z.array(
		z.object({
			index: z.number(),
			relevance_score: z.number(),
		}),
	),
});

/**
 * Reranks documents based on relevance to a query using Jina Reranker
 * @param query The search query
 * @param documents Array of document texts to rerank
 * @returns Reranked results with index mapping to original documents and relevance scores
 */
export async function reranker(
	query: string,
	documents: string[],
): Promise<RerankerResult> {
	try {
		// If no documents are provided, return an empty result
		if (!documents.length) {
			return { results: [] };
		}

		// Basic validation
		if (!query.trim()) {
			throw new Error("Query cannot be empty");
		}

		const response = await fetch("https://api.jina.ai/v1/rerank", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.JINA_API_KEY}`,
			},
			body: JSON.stringify({
				model: "jina-reranker-v2-base-multilingual",
				query: query,
				documents: documents,
				top_n: documents.length, // Using top_n instead of top_k
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			console.error("Jina reranker error:", error);
			throw new Error(`Reranker API error: ${response.status}`);
		}

		const data = await response.json();
		const parsedData = RerankerResponseSchema.parse(data);

		// Transform the response to match our expected format
		return {
			results: parsedData.results.map((item, index) => ({
				index: item.index || index,
				score: item.relevance_score || 0,
			})),
		};
	} catch (error) {
		console.error("Reranker error:", error);

		// On error, return the original document order with uniform scores
		return {
			results: documents.map((_, index) => ({
				index,
				score: 1.0 - index * 0.01, // Slightly decreasing scores to maintain original order
			})),
		};
	}
}
