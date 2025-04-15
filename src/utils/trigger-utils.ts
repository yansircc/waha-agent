import { qdrantService } from "@/lib/qdrant-service";

/**
 * Generic webhook response interface
 */
export interface WebhookResponse {
	success: boolean;
	error?: string;
	[key: string]: unknown;
}

/**
 * Send a webhook response
 */
export async function sendWebhookResponse<T extends WebhookResponse>(
	webhookUrl: string,
	data: T,
): Promise<T> {
	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			console.error("Failed to send webhook response", {
				status: response.status,
				statusText: response.statusText,
			});
		}

		return data;
	} catch (error) {
		console.error("Error sending webhook response", {
			error: error instanceof Error ? error.message : String(error),
		});
		return data;
	}
}

/**
 * Interface for text chunks
 */
export interface TextChunk {
	text: string;
	metadata?: Record<string, unknown>;
}

/**
 * Custom function to split text into chunks with overlap
 */
export function chunkText(
	text: string,
	options: {
		chunkSize?: number;
		chunkOverlap?: number;
		source?: string;
	} = {},
): TextChunk[] {
	const { chunkSize = 512, chunkOverlap = 50, source = "" } = options;

	// Clean and normalize text
	const cleanedText = text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

	// If text is smaller than chunk size, return as single chunk
	if (cleanedText.length <= chunkSize) {
		return [
			{
				text: cleanedText,
				metadata: { source },
			},
		];
	}

	const chunks: TextChunk[] = [];
	let startIndex = 0;

	// Create chunks with overlap
	while (startIndex < cleanedText.length) {
		// Determine end index for this chunk
		let endIndex = Math.min(startIndex + chunkSize, cleanedText.length);

		// Don't cut in the middle of a word if not at the end of text
		if (endIndex < cleanedText.length) {
			// Find the next space after the chunk size
			const nextSpaceIndex = cleanedText.indexOf(" ", endIndex);
			if (nextSpaceIndex !== -1 && nextSpaceIndex - endIndex < 20) {
				// If next space is close enough, extend to it
				endIndex = nextSpaceIndex;
			} else {
				// Otherwise, find the last space within the chunk
				const lastSpaceIndex = cleanedText.lastIndexOf(" ", endIndex);
				if (lastSpaceIndex > startIndex) {
					endIndex = lastSpaceIndex;
				}
			}
		}

		// Extract the chunk
		const chunkText = cleanedText.substring(startIndex, endIndex).trim();

		if (chunkText) {
			chunks.push({
				text: chunkText,
				metadata: { source },
			});
		}

		// Move the start index, accounting for overlap
		startIndex = endIndex - chunkOverlap;

		// Ensure we're making progress
		if (startIndex <= 0 || startIndex >= cleanedText.length) {
			break;
		}
	}

	return chunks;
}

/**
 * Create Qdrant collection if it doesn't exist
 */
export async function createCollectionIfNotExists(
	collectionName: string,
): Promise<void> {
	try {
		// Check if collection exists using the dedicated endpoint
		const exists = await qdrantService.collectionExists(collectionName);

		if (!exists) {
			console.info("Creating new Qdrant collection", { collectionName });

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

			console.info("Qdrant collection created successfully", {
				collectionName,
			});
		} else {
			console.info("Using existing Qdrant collection", { collectionName });
		}
	} catch (error) {
		console.error("Failed to create/check Qdrant collection", {
			error: error instanceof Error ? error.message : String(error),
			collectionName,
		});
		throw error;
	}
}

/**
 * Check if the URL points to a markdown or text file
 * Handles URLs with query parameters
 */
export function isMarkdownOrTextFile(url: string): boolean {
	try {
		// Remove query parameters and get the base URL
		const baseUrl = new URL(url).pathname.toLowerCase();
		return baseUrl.endsWith(".md") || baseUrl.endsWith(".txt");
	} catch (error) {
		console.warn("Failed to parse URL for file type check", { url, error });
		return false;
	}
}
