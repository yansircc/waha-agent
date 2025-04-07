import { mastra } from "@/mastra";
import { cohere } from "@ai-sdk/cohere";
import { MDocument } from "@mastra/rag";
import { logger, task } from "@trigger.dev/sdk/v3";
import { embedMany } from "ai";

interface ProcessDocumentPayload {
	content: string;
	knowledgeBaseId: string;
	documentName: string;
	userId: string;
	documentId: string;
	webhookUrl?: string; // Optional now as we're storing directly
}

export const processDocumentTask = task({
	id: "embedding",
	maxDuration: 600, // 10 minutes max duration

	run: async (payload: ProcessDocumentPayload) => {
		const {
			content,
			knowledgeBaseId,
			documentName,
			userId,
			documentId,
			webhookUrl,
		} = payload;

		logger.log("Starting document processing", { documentId, knowledgeBaseId });

		try {
			// Create document and chunk it
			const doc = MDocument.fromText(content);
			const chunks = await doc.chunk({
				strategy: "recursive",
				size: 512,
				overlap: 50,
				separator: "\n",
			});

			logger.log("Document chunked successfully", {
				documentId,
				chunksCount: chunks.length,
			});

			// Embed all chunks at once
			const { embeddings: allEmbeddings } = await embedMany({
				model: cohere.embedding("embed-multilingual-v3.0"),
				values: chunks.map((chunk) => chunk.text),
			});

			logger.log("Embeddings generated successfully", {
				documentId,
				embeddingsCount: allEmbeddings.length,
			});

			// Get the vector store from Mastra - the official way
			const vectorStore = mastra.getVector("pgVector");
			const indexName = "wm_kb_vectors";

			// Create index if not exists
			try {
				await vectorStore.createIndex({
					indexName,
					dimension: 1024, // Use the dimension from cohere.embedding model
				});
				logger.log("Vector index created or already exists", { indexName });
			} catch (error) {
				// Index may already exist, which is fine
				logger.log("Index may already exist", { error });
			}

			// Prepare metadata for vectors
			const chunksMetadata = chunks.map((chunk, index) => ({
				text: chunk.text,
				source: documentName,
				knowledgeBaseId,
				userId,
				documentId,
				chunkIndex: index,
				timestamp: new Date().toISOString(),
			}));

			// Store embeddings using Mastra's vector store
			await vectorStore.upsert({
				indexName,
				vectors: allEmbeddings,
				metadata: chunksMetadata,
			});

			logger.log("Vectors stored successfully", {
				documentId,
				count: allEmbeddings.length,
			});

			// If webhook URL is provided, notify of success
			if (webhookUrl) {
				await fetch(webhookUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						success: true,
						documentId,
						knowledgeBaseId,
						message: `Processed and stored ${chunks.length} embeddings for document ${documentName}`,
					}),
				});

				logger.log("Webhook notification sent", { documentId });
			}

			return {
				success: true,
				chunksCount: chunks.length,
				embeddingsCount: allEmbeddings.length,
				message: "Embeddings stored successfully in vector database",
			};
		} catch (error) {
			logger.error("Error processing document", {
				documentId,
				error: error instanceof Error ? error.message : String(error),
			});

			// If webhook URL is provided, notify of failure
			if (webhookUrl) {
				await fetch(webhookUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						success: false,
						documentId,
						knowledgeBaseId,
						error: error instanceof Error ? error.message : String(error),
					}),
				});
			}

			throw error;
		}
	},
});
