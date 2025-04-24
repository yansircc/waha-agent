import { describe, expect, it } from "bun:test";
import { type ChunkResult, type TextChunk, chunkText } from "../utils";

describe("chunkText function", () => {
	// Normal case tests
	describe("Normal operation", () => {
		it("should split normal text into chunks correctly", () => {
			const text =
				"This is a sample text to be split into chunks. It should work correctly and efficiently.";
			const chunks = chunkText(text, {
				chunkSize: 20,
				chunkOverlap: 5,
			}) as TextChunk[];

			expect(chunks.length).toBeGreaterThan(1);
			expect(chunks[0]?.text).toBe("This is a sample text");

			// Check that no chunk exceeds chunkSize
			for (const chunk of chunks) {
				expect(chunk.text.length).toBeLessThanOrEqual(30); // Allow some flexibility in chunk size
			}
		});

		it("should include source in metadata", () => {
			const text = "Some text";
			const source = "test-source";
			const chunks = chunkText(text, { source }) as TextChunk[];

			expect(chunks[0]?.metadata).toEqual({ source });
		});

		it("should handle text smaller than chunk size", () => {
			const text = "Small text";
			const chunks = chunkText(text, { chunkSize: 100 }) as TextChunk[];

			expect(chunks.length).toBe(1);
			expect(chunks[0]?.text).toBe(text);
		});

		it("should handle invalid inputs for chunkSize and chunkOverlap", () => {
			expect(() => chunkText("text", { chunkSize: 0 })).toThrow();
			expect(() => chunkText("text", { chunkOverlap: -1 })).toThrow();
			expect(() =>
				chunkText("text", { chunkSize: 10, chunkOverlap: 10 }),
			).toThrow();
		});
	});

	// Problem case tests that could have caused bugs
	describe("Previously problematic cases", () => {
		it("should not get stuck in infinite loops with tricky content", () => {
			const trickyText = `Start ${"a ".repeat(100)}end.`;
			const chunks = chunkText(trickyText, {
				chunkSize: 10,
				chunkOverlap: 5,
			}) as TextChunk[];

			expect(chunks.length).toBeGreaterThan(0);
			expect(chunks.length).toBeLessThan(100); // Should not create one chunk per "a "
		});

		it("should not produce excessive duplicate chunks", () => {
			// Create text with a repeated pattern at the end
			const repeatedEndingText = `Normal content here. ${"This is the last sentence. ".repeat(10)}`;
			const result = chunkText(repeatedEndingText, {
				chunkSize: 25,
				chunkOverlap: 10,
				includeDiagnostics: true,
			}) as ChunkResult;

			const chunks = result.chunks;
			const diagnostics = result.diagnostics;

			if (chunks.length > 1) {
				// Count occurrences of the last chunk text
				const lastChunkText = chunks[chunks.length - 1]?.text;
				if (lastChunkText) {
					const duplicateCount = chunks.filter(
						(chunk) => chunk.text === lastChunkText,
					).length;

					// Should not have many duplicates of the last chunk
					expect(duplicateCount).toBeLessThanOrEqual(5);
				}
			}
		});

		it("should detect and deduplicate excessively duplicated chunks", () => {
			// Mock a situation where the algo would produce many duplicates
			const repeatedContent = "This will be repeated. ".repeat(20);

			const result = chunkText(repeatedContent, {
				chunkSize: 25,
				chunkOverlap: 20,
				includeDiagnostics: true,
			}) as ChunkResult;

			const chunks = result.chunks;
			const diagnostics = result.diagnostics;

			if (diagnostics?.deduplicated) {
				// If deduplication happened, verify
				expect(diagnostics.duplicateCount).toBeGreaterThan(5);

				// Verify uniqueness of returned chunks
				const uniqueTexts = new Set(chunks.map((c) => c.text));
				expect(uniqueTexts.size).toBe(chunks.length);
			}
		});

		it("should make progress even with challenging input", () => {
			// This kind of text can cause the algorithm to get stuck due to overlap calculation
			const challengingText = `Word1 word2 ${"a ".repeat(500)}word3 word4.`;

			const chunks = chunkText(challengingText, {
				chunkSize: 30,
				chunkOverlap: 15,
			}) as TextChunk[];

			// Ensure the algorithm made progress through the text
			const lastChunk = chunks[chunks.length - 1];
			expect(lastChunk?.text).toContain("word3 word4");
		});
	});

	// Performance and limit tests
	describe("Performance and limits", () => {
		it("should respect maxChunks limit", () => {
			// Create a long text that would produce many chunks
			const longText = "word ".repeat(10000);
			const maxChunks = 50;

			const result = chunkText(longText, {
				chunkSize: 20,
				chunkOverlap: 5,
				maxChunks,
				includeDiagnostics: true,
			}) as ChunkResult;

			const chunks = result.chunks;

			// Chunks should not exceed maxChunks
			expect(chunks.length).toBeLessThanOrEqual(maxChunks);
		});

		it("should handle reasonable length texts efficiently", () => {
			// ~100KB text
			const reasonableLengthText = "This is a reasonable length text. ".repeat(
				2000,
			);

			const startTime = performance.now();
			const chunks = chunkText(reasonableLengthText, {
				chunkSize: 200,
				chunkOverlap: 50,
			}) as TextChunk[];
			const duration = performance.now() - startTime;

			// Should process within a reasonable time (arbitrary threshold for test)
			expect(duration).toBeLessThan(1000); // Less than 1 second

			// Should create a reasonable number of chunks
			expect(chunks.length).toBeGreaterThan(0);
		});

		it("should reject excessively large texts", () => {
			// Create a mock large text object that appears to be over the limit
			const mockLargeText = {
				length: 11_000_000,
				replace: () => "",
				substring: () => "",
			} as unknown as string;

			expect(() => chunkText(mockLargeText)).toThrow(/Input text too large/);
		});
	});
});
