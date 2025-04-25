import { qdrantService } from "@/lib/qdrant-service";
import { logger } from "@trigger.dev/sdk";
import type { WebhookResponse } from "./types";

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

/**
 * Interface for text chunks
 */
export interface TextChunk {
	text: string;
	metadata?: Record<string, unknown>;
}

/**
 * Options for text chunking
 */
export interface ChunkOptions {
	chunkSize?: number;
	chunkOverlap?: number;
	source?: string;
	maxChunks?: number;
	includeDiagnostics?: boolean;
}

/**
 * Diagnostics information from text chunking process
 */
export interface ChunkDiagnostics {
	originalLength: number;
	iterations: number;
	deduplicated: boolean;
	duplicateCount?: number;
}

/**
 * Result of text chunking including diagnostics
 */
export interface ChunkResult {
	chunks: TextChunk[];
	diagnostics?: ChunkDiagnostics;
}

/**
 * Custom function to split text into chunks with overlap
 * @param text The text to split into chunks
 * @param options Configuration options
 * @returns Array of text chunks or ChunkResult with diagnostics if includeDiagnostics is true
 */
export function chunkText(
	text: string,
	options: ChunkOptions = {},
): TextChunk[] | ChunkResult {
	// Validate inputs and set defaults
	const {
		chunkSize = 512,
		chunkOverlap = 50,
		source = "",
		maxChunks = 1000,
		includeDiagnostics = false,
	} = options;

	// Initialize diagnostics
	const diagnostics: ChunkDiagnostics = {
		originalLength: text.length,
		iterations: 0,
		deduplicated: false,
	};

	// Safety check - ensure sensible values
	if (chunkSize <= 0) throw new Error("chunkSize must be positive");
	if (chunkOverlap < 0) throw new Error("chunkOverlap cannot be negative");
	if (chunkOverlap >= chunkSize)
		throw new Error("chunkOverlap must be less than chunkSize");

	// Check for empty text
	if (!text || text.length === 0) {
		return includeDiagnostics ? { chunks: [], diagnostics } : [];
	}

	// Check for excessively large input
	const MAX_LENGTH = 10_000_000; // 10MB limit
	if (text.length > MAX_LENGTH) {
		throw new Error(
			`Input text too large (${text.length} chars, max ${MAX_LENGTH})`,
		);
	}

	// Clean and normalize text more efficiently
	// Use a regex that matches all whitespace characters and replaces with a single space
	const cleanedText = text.replace(/\s+/g, " ").trim();

	// If text is smaller than chunk size, return as single chunk
	if (cleanedText.length <= chunkSize) {
		const singleChunk = [
			{
				text: cleanedText,
				metadata: { source },
			},
		];
		return includeDiagnostics
			? { chunks: singleChunk, diagnostics }
			: singleChunk;
	}

	const chunks: TextChunk[] = [];
	let startIndex = 0;
	let lastEndIndex = 0; // Track the last end index to detect lack of progress

	// Safety check - set maximum chunk iterations to prevent infinite loops
	const MAX_ITERATIONS = maxChunks * 2; // Double the max chunks as a safety measure
	let iterations = 0;

	// Create chunks with overlap
	while (startIndex < cleanedText.length && iterations < MAX_ITERATIONS) {
		iterations++;
		diagnostics.iterations = iterations;

		// Determine end index for this chunk
		let endIndex = Math.min(startIndex + chunkSize, cleanedText.length);

		// Don't cut in the middle of a word if not at the end of text
		if (endIndex < cleanedText.length) {
			// Find the next space after the chunk size
			const nextSpaceIndex = cleanedText.indexOf(" ", endIndex);

			// Only extend if next space is within reasonable distance
			if (nextSpaceIndex !== -1 && nextSpaceIndex - endIndex < 50) {
				endIndex = nextSpaceIndex;
			} else {
				// Otherwise, find the last space within the chunk
				const lastSpaceIndex = cleanedText.lastIndexOf(" ", endIndex);
				if (lastSpaceIndex > startIndex) {
					endIndex = lastSpaceIndex;
				}
			}
		}

		// Detect if we're not making progress
		if (endIndex <= startIndex) {
			// No progress, need to break
			break;
		}

		// Extract the chunk
		const chunkText = cleanedText.substring(startIndex, endIndex).trim();

		if (chunkText) {
			chunks.push({
				text: chunkText,
				metadata: { source },
			});
		}

		// Check if we're actually advancing through the text
		// This prevents getting stuck on the same piece of text
		if (endIndex <= lastEndIndex) {
			// Not advancing, force break
			break;
		}
		lastEndIndex = endIndex;

		// Move the start index, accounting for overlap
		const newStartIndex = endIndex - chunkOverlap;

		// Ensure we're making forward progress
		if (newStartIndex <= startIndex) {
			// Force progress by advancing at least one character
			startIndex = endIndex;

			// If we're at the end, break
			if (startIndex >= cleanedText.length) {
				break;
			}
		} else {
			startIndex = newStartIndex;
		}

		// Ensure we're making progress and not stuck in a loop
		if (startIndex >= cleanedText.length) {
			break;
		}

		// Check if we've reached the maximum number of chunks
		if (chunks.length >= maxChunks) {
			break;
		}
	}

	// Fix for short final chunks - combine the last two chunks if the last one is too short
	if (chunks.length >= 2) {
		const lastChunk = chunks[chunks.length - 1];
		const secondLastChunk = chunks[chunks.length - 2];

		// If the last chunk is significantly shorter than the target chunk size
		// (less than 1/3 of chunkSize), combine it with the previous chunk
		if (lastChunk && secondLastChunk && lastChunk.text.length < chunkSize / 3) {
			// Remove the last two chunks
			chunks.splice(chunks.length - 2, 2);

			// Combine their text and add as a single chunk
			const combinedText = `${secondLastChunk.text} ${lastChunk.text}`.trim();
			chunks.push({
				text: combinedText,
				metadata: { source },
			});
		}
	}

	// Detect potentially problematic chunking patterns
	if (chunks.length > 1) {
		const lastChunkText = chunks[chunks.length - 1]?.text || "";
		const duplicateCount = chunks.filter(
			(chunk) => chunk.text === lastChunkText,
		).length;

		// If the last chunk is repeated many times, this indicates a problem
		if (duplicateCount > 5) {
			// Return only the unique chunks
			const uniqueChunks: TextChunk[] = [];
			const seenTexts = new Set<string>();

			for (const chunk of chunks) {
				if (!seenTexts.has(chunk.text)) {
					seenTexts.add(chunk.text);
					uniqueChunks.push(chunk);
				}
			}

			diagnostics.deduplicated = true;
			diagnostics.duplicateCount = duplicateCount;

			return includeDiagnostics
				? { chunks: uniqueChunks, diagnostics }
				: uniqueChunks;
		}
	}

	return includeDiagnostics ? { chunks, diagnostics } : chunks;
}

/**
 * Create Qdrant collection if it doesn't exist
 */
export async function createCollectionIfNotExists(
	collectionName: string,
): Promise<void> {
	// Check if collection exists using the dedicated endpoint
	const exists = await qdrantService.collectionExists(collectionName);

	if (!exists) {
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
		return false;
	}
}
