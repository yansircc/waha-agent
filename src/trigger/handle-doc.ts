import { convertToMarkdown } from "@/lib/markitdown";
import { qdrantService } from "@/lib/qdrant-service";
import { cohere } from "@ai-sdk/cohere";
import { logger, task } from "@trigger.dev/sdk";
import { embedMany } from "ai";
import type { WebhookResponse } from "./types";
import {
	type TextChunk,
	chunkText,
	createCollectionIfNotExists,
	isMarkdownOrTextFile,
	sendWebhookResponse,
} from "./utils";

export interface HandleDocPayload {
	url: string;
	webhookUrl: string;
	userId: string;
	kbId: string;
	documentId: string;
	collectionName: string;
}

// Extend the generic webhook response for document handling
interface DocWebhookResponse extends WebhookResponse {
	kbId?: string;
	documentId?: string;
	collectionName?: string;
	chunkCount?: number;
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
			const text = await response.text();
			return text;
		}
		// For other file types, convert to markdown
		return await convertToMarkdown(url);
	} catch (error) {
		logger.error("Failed to get document content", { url, error });
		throw error;
	}
}

// Process embeddings and store in batches to avoid memory issues
async function processEmbeddingsInBatches(
	embeddings: number[][],
	chunks: TextChunk[],
	collectionName: string,
	documentId: string,
	userId: string,
	kbId: string,
	url: string,
	batchSize = 100,
): Promise<void> {
	// Calculate number of batches
	const totalChunks = chunks.length;
	const batchCount = Math.ceil(totalChunks / batchSize);

	logger.info(`Processing ${totalChunks} embeddings in ${batchCount} batches`);

	for (let i = 0; i < batchCount; i++) {
		const startIdx = i * batchSize;
		const endIdx = Math.min(startIdx + batchSize, totalChunks);

		// Prepare current batch of points
		const batchPoints = embeddings
			.slice(startIdx, endIdx)
			.map((vector, index) => {
				const actualIndex = startIdx + index;
				const chunkText = chunks[actualIndex]?.text || "";

				// Use numeric ID instead of string ID as Qdrant supports numeric IDs
				// Based on error message: "value ... is not a valid point ID, valid values are either an unsigned integer or a UUID"
				// We're creating a unique numeric ID based on timestamp and index
				const numericId = Number.parseInt(
					`${Date.now().toString().slice(-6)}${actualIndex}`,
					10,
				);

				return {
					id: numericId,
					vector,
					payload: {
						text: chunkText,
						userId,
						kbId,
						documentId, // Keep original documentId in payload
						pointId: `${documentId}-${actualIndex}`, // Store original point ID in payload
						url,
						chunkIndex: actualIndex,
						totalChunks,
						createdAt: new Date().toISOString(),
					},
				};
			});

		try {
			// Insert batch
			await qdrantService.upsertPoints(collectionName, batchPoints);
			logger.info(
				`Processed batch ${i + 1}/${batchCount} (${startIdx} to ${endIdx - 1})`,
			);
		} catch (error) {
			// Log detailed error information for debugging
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.error("Failed to upsert points batch to Qdrant", {
				error: errorMsg,
				collectionName,
				batchNumber: i + 1,
				totalBatches: batchCount,
				batchSize: batchPoints.length,
				firstPointId: batchPoints[0]?.id,
			});
			throw error;
		}
	}
}

export const handleDoc = task({
	id: "handle-doc",
	run: async (payload: HandleDocPayload) => {
		const { url, webhookUrl, userId, kbId, documentId, collectionName } =
			payload;

		try {
			// 1. Get document content based on file type
			let content = await getDocumentContent(url);
			logger.info("Document content retrieved", {
				url,
				isMarkdownOrText: isMarkdownOrTextFile(url),
				contentSize: content.length,
			});

			// 2. Split document into chunks using our custom chunking function
			let chunks: TextChunk[] = [];
			try {
				chunks = chunkText(content, {
					chunkSize: 512,
					chunkOverlap: 50,
					source: url,
					maxChunks: 1000, // Explicitly set maximum chunks
				}) as TextChunk[];

				logger.info("Document chunking completed", {
					chunkCount: chunks.length,
					inputLength: content.length,
					averageChunkLength:
						chunks.length > 0
							? chunks.reduce((sum, chunk) => sum + chunk.text.length, 0) /
								chunks.length
							: 0,
				});
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				logger.error("Failed to chunk document content", {
					url,
					error: errorMsg,
					contentSize: content.length,
				});
				return await sendWebhookResponse<DocWebhookResponse>(webhookUrl, {
					success: false,
					error: `Failed to chunk document: ${errorMsg}`,
					kbId,
					documentId,
					collectionName,
				});
			}

			// Free up memory
			const contentLength = content.length;
			content = "";

			if (!chunks || chunks.length === 0) {
				logger.error("Failed to chunk document - no chunks produced", { url });
				return await sendWebhookResponse<DocWebhookResponse>(webhookUrl, {
					success: false,
					error: "Failed to chunk document - no chunks produced",
					kbId,
					documentId,
					collectionName,
				});
			}

			logger.info("Document chunked successfully", {
				chunkCount: chunks.length,
				documentId,
				contentSize: contentLength,
			});

			// 3. Generate embeddings for all chunks
			let embeddings: number[][] = [];
			try {
				const result = await embedMany({
					values: chunks.map((chunk) => chunk.text),
					model: cohere.embedding("embed-multilingual-v3.0"),
					maxRetries: 3,
				});
				embeddings = result.embeddings;
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				logger.error("Failed to generate embeddings", {
					url,
					error: errorMsg,
					chunkCount: chunks.length,
				});
				return await sendWebhookResponse<DocWebhookResponse>(webhookUrl, {
					success: false,
					error: `Failed to generate embeddings: ${errorMsg}`,
					kbId,
					documentId,
					collectionName,
				});
			}

			if (!embeddings || embeddings.length !== chunks.length) {
				logger.error("Embedding count mismatch", {
					expectedCount: chunks.length,
					receivedCount: embeddings?.length,
				});
				return await sendWebhookResponse<DocWebhookResponse>(webhookUrl, {
					success: false,
					error: `Embedding count mismatch: expected ${chunks.length}, received ${embeddings?.length}`,
					kbId,
					documentId,
					collectionName,
				});
			}

			// 4. Ensure collection exists
			try {
				logger.info("Ensuring collection exists", { collectionName });
				await createCollectionIfNotExists(collectionName);
				logger.info("Collection ready", { collectionName });
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				logger.error("Failed to create collection", {
					collectionName,
					error: errorMsg,
				});
				return await sendWebhookResponse<DocWebhookResponse>(webhookUrl, {
					success: false,
					error: `Failed to create collection: ${errorMsg}`,
					kbId,
					documentId,
					collectionName,
				});
			}

			// 5. Store vectors with metadata in batches
			await processEmbeddingsInBatches(
				embeddings,
				chunks,
				collectionName,
				documentId,
				userId,
				kbId,
				url,
			);

			logger.info("Document vectors stored in Qdrant with metadata", {
				documentId,
				kbId,
				collectionName,
				userId,
				chunkCount: chunks.length,
			});

			// 6. Return success response
			return await sendWebhookResponse<DocWebhookResponse>(webhookUrl, {
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

			return await sendWebhookResponse<DocWebhookResponse>(webhookUrl, {
				success: false,
				error: errorMessage,
				kbId,
				documentId,
				collectionName,
			});
		}
	},
});
