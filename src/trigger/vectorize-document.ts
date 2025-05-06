import { qdrantService } from "@/lib/qdrant-service";
import { cohere } from "@ai-sdk/cohere";
import { schemaTask } from "@trigger.dev/sdk";
import { embedMany } from "ai";
import { z } from "zod";
import {
	type TextChunk,
	chunkText,
	createCollectionIfNotExists,
} from "./utils";

// Schema for document vectorization task
const VectorizeDocumentSchema = z.object({
	url: z.string().url(),
	userId: z.string().min(1, "User ID is required"),
	kbId: z.string().min(1, "Knowledge base ID is required"),
	documentId: z.string().min(1, "Document ID is required"),
	collectionName: z.string().min(1, "Collection name is required"),
});

type VectorizeDocumentPayload = z.infer<typeof VectorizeDocumentSchema>;

interface VectorizeDocumentResult {
	success: boolean;
	kbId: string;
	documentId: string;
	collectionName: string;
	chunkCount?: number;
	error?: string;
}

/**
 * Get document content based on URL
 */
async function getDocumentContent(url: string): Promise<string> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch document: ${response.statusText}`);
		}
		return await response.text();
	} catch (error) {
		console.error("Failed to get document content", { url, error });
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

	console.log(`Processing ${totalChunks} embeddings in ${batchCount} batches`);

	for (let i = 0; i < batchCount; i++) {
		const startIdx = i * batchSize;
		const endIdx = Math.min(startIdx + batchSize, totalChunks);

		// Prepare current batch of points
		const batchPoints = embeddings
			.slice(startIdx, endIdx)
			.map((vector, index) => {
				const actualIndex = startIdx + index;
				const chunkText = chunks[actualIndex]?.text || "";

				// Create a unique numeric ID
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
						documentId,
						pointId: `${documentId}-${actualIndex}`,
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
			console.log(
				`Processed batch ${i + 1}/${batchCount} (${startIdx} to ${endIdx - 1})`,
			);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error("Failed to upsert points batch to Qdrant", {
				error: errorMsg,
				collectionName,
				batchNumber: i + 1,
				totalBatches: batchCount,
				batchSize: batchPoints.length,
			});
			throw error;
		}
	}
}

export const vectorizeDocument = schemaTask({
	id: "vectorize-document",
	schema: VectorizeDocumentSchema,
	run: async (payload): Promise<VectorizeDocumentResult> => {
		const { url, userId, kbId, documentId, collectionName } = payload;
		const startTime = Date.now();

		try {
			// 1. Get document content based on file type
			let content = await getDocumentContent(url);
			console.log("Document content retrieved", {
				url,
				contentSize: content.length,
			});

			// 2. Split document into chunks
			let chunks: TextChunk[] = [];
			try {
				chunks = chunkText(content, {
					chunkSize: 512,
					chunkOverlap: 50,
					source: url,
					maxChunks: 1000,
				}) as TextChunk[];
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				console.error("Failed to chunk document content", {
					url,
					error: errorMsg,
				});
				return {
					success: false,
					error: `Failed to chunk document: ${errorMsg}`,
					kbId,
					documentId,
					collectionName,
				};
			}

			// Free up memory
			content = "";

			if (!chunks || chunks.length === 0) {
				return {
					success: false,
					error: "Failed to chunk document - no chunks produced",
					kbId,
					documentId,
					collectionName,
				};
			}

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
				return {
					success: false,
					error: `Failed to generate embeddings: ${errorMsg}`,
					kbId,
					documentId,
					collectionName,
				};
			}

			if (!embeddings || embeddings.length !== chunks.length) {
				return {
					success: false,
					error: `Embedding count mismatch: expected ${chunks.length}, received ${embeddings?.length}`,
					kbId,
					documentId,
					collectionName,
				};
			}

			// 4. Ensure collection exists
			try {
				await createCollectionIfNotExists(collectionName);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				return {
					success: false,
					error: `Failed to create collection: ${errorMsg}`,
					kbId,
					documentId,
					collectionName,
				};
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

			const duration = Date.now() - startTime;
			console.log(`Document vectorization completed in ${duration}ms`, {
				documentId,
				chunkCount: chunks.length,
			});

			// 6. Return success result
			return {
				success: true,
				kbId,
				documentId,
				collectionName,
				chunkCount: chunks.length,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error("Error processing document", {
				error: errorMessage,
				url,
				kbId,
				documentId,
			});

			return {
				success: false,
				error: errorMessage,
				kbId,
				documentId,
				collectionName,
			};
		}
	},
});
