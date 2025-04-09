import { env } from "@/env";
import { convertToMarkdown } from "@/lib/markitdown";
import { qdrantService } from "@/lib/qdrant-service";
import { cohere } from "@ai-sdk/cohere";
import { QdrantVector } from "@mastra/qdrant";
import { MDocument } from "@mastra/rag";
import { logger, task } from "@trigger.dev/sdk/v3";
import { embedMany } from "ai";

const qdrant = new QdrantVector(env.QDRANT_URL, env.QDRANT_API_KEY);

export interface HandleDocPayload {
	url: string;
	webhookUrl: string;
	userId: string;
	kbId: string;
	documentId: string;
	collectionName: string;
}

interface WebhookResponse {
	success: boolean;
	kbId?: string;
	documentId?: string;
	collectionName?: string;
	error?: string;
	chunkCount?: number;
}

/**
 * Check if the URL points to a markdown or text file
 * Handles URLs with query parameters
 */
function isMarkdownOrTextFile(url: string): boolean {
	try {
		// Remove query parameters and get the base URL
		const baseUrl = new URL(url).pathname.toLowerCase();
		return baseUrl.endsWith(".md") || baseUrl.endsWith(".txt");
	} catch (error) {
		logger.warn("Failed to parse URL for file type check", { url, error });
		return false;
	}
}

/**
 * Get document content based on URL and file type
 */
async function getDocumentContent(url: string): Promise<string> {
	try {
		if (isMarkdownOrTextFile(url)) {
			// For markdown or text files, fetch directly
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Failed to fetch document: ${response.statusText}`);
			}
			return await response.text();
		}
		// For other file types, convert to markdown
		return await convertToMarkdown(url);
	} catch (error) {
		logger.error("Failed to get document content", { url, error });
		throw error;
	}
}

/**
 * Create Qdrant collection if it doesn't exist
 */
async function createCollectionIfNotExists(
	collectionName: string,
): Promise<void> {
	try {
		// Check if collection exists using the dedicated endpoint
		const exists = await qdrantService.collectionExists(collectionName);

		if (!exists) {
			logger.info("Creating new Qdrant collection", { collectionName });

			// Create collection with standard configuration
			await qdrantService.createCollection(collectionName, {
				vectors: {
					size: 1024, // Cohere embed-multilingual-v3.0 dimension
					distance: "Cosine",
				},
				optimizers_config: {
					default_segment_number: 2, // Optimize for faster searches
				},
			});

			logger.info("Qdrant collection created successfully", { collectionName });
		} else {
			logger.info("Using existing Qdrant collection", { collectionName });
		}
	} catch (error) {
		logger.error("Failed to create/check Qdrant collection", {
			error: error instanceof Error ? error.message : String(error),
			collectionName,
		});
		throw error;
	}
}

// Helper function to send webhook response
async function sendWebhookResponse(
	webhookUrl: string,
	data: WebhookResponse,
): Promise<WebhookResponse> {
	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			logger.error("Failed to send webhook response", {
				status: response.status,
				statusText: response.statusText,
			});
		}

		return data;
	} catch (error) {
		logger.error("Error sending webhook response", {
			error: error instanceof Error ? error.message : String(error),
		});
		return data;
	}
}

export const handleDoc = task({
	id: "handle-doc",
	run: async (payload: HandleDocPayload) => {
		const { url, webhookUrl, userId, kbId, documentId, collectionName } =
			payload;

		try {
			// 1. Get document content based on file type
			const content = await getDocumentContent(url);
			logger.info("Document content retrieved", {
				url,
				isMarkdownOrText: isMarkdownOrTextFile(url),
			});

			// // 2. Split document into chunks
			const docFromText = MDocument.fromText(content);
			const chunks = await docFromText.chunk({
				strategy: "recursive",
				size: 512,
				overlap: 50,
			});

			// const chunks = [
			// 	{
			// 		text: content,
			// 		metadata: {
			// 			source: url,
			// 		},
			// 	},
			// ]; // TODO: split text manually

			if (!chunks || chunks.length === 0) {
				logger.error("Failed to chunk document", { url });
				return await sendWebhookResponse(webhookUrl, {
					success: false,
					error: "Failed to chunk document",
					kbId,
					documentId,
					collectionName,
				});
			}

			logger.info("Document chunked successfully", {
				chunkCount: chunks.length,
				documentId,
			});

			// 3. Generate embeddings for all chunks
			const { embeddings } = await embedMany({
				values: chunks.map((chunk) => chunk.text),
				model: cohere.embedding("embed-multilingual-v3.0"),
				maxRetries: 3,
			});

			if (!embeddings || embeddings.length !== chunks.length) {
				logger.error("Failed to generate embeddings", {
					expectedCount: chunks.length,
					receivedCount: embeddings?.length,
				});
				return await sendWebhookResponse(webhookUrl, {
					success: false,
					error: "Failed to generate embeddings",
					kbId,
					documentId,
					collectionName,
				});
			}

			// 4. Ensure collection exists
			await createCollectionIfNotExists(collectionName);

			// 5. Store vectors with metadata
			await qdrant.upsert({
				indexName: collectionName,
				vectors: embeddings,
				metadata: chunks.map((chunk, index) => ({
					text: chunk.text,
					userId,
					kbId,
					documentId,
					url,
					chunkIndex: index,
					totalChunks: chunks.length,
					createdAt: new Date().toISOString(),
				})),
			});

			logger.info("Document vectors stored in Qdrant with metadata", {
				documentId,
				kbId,
				collectionName,
				userId,
				chunkCount: chunks.length,
			});

			// 6. Return success response
			return await sendWebhookResponse(webhookUrl, {
				success: true,
				kbId,
				documentId,
				collectionName,
				chunkCount: chunks.length,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error("Error processing document", {
				error: errorMessage,
				url,
				kbId,
				documentId,
				collectionName,
			});

			return await sendWebhookResponse(webhookUrl, {
				success: false,
				error: errorMessage,
				kbId,
				documentId,
				collectionName,
			});
		}
	},
});
