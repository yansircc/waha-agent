import { describe, expect, it } from "bun:test";
import {
	type HumanTypingOptions,
	calculateTypingDelay,
	humanizeText,
	simulateHumanTyping,
	splitIntoHumanChunks,
} from "../human-typing-simulator";

describe("Human Typing Simulator", () => {
	describe("splitIntoHumanChunks", () => {
		it("should handle empty messages", () => {
			expect(splitIntoHumanChunks("")).toEqual([]);
			expect(splitIntoHumanChunks("   ")).toEqual([]);
		});

		it("should keep short messages intact", () => {
			const shortMessage = "This is a short message";
			expect(splitIntoHumanChunks(shortMessage)).toEqual([shortMessage]);
		});

		it("should split long messages into chunks", () => {
			const longMessage =
				"This is a very long message that should be split into multiple chunks because it exceeds the maximum chunk length. Let's see how well it works!";
			const chunks = splitIntoHumanChunks(longMessage, { maxChunkLength: 50 });

			expect(chunks.length).toBeGreaterThan(1);
			expect(chunks.every((chunk) => chunk.length <= 50)).toBe(true);
		});

		it("should split messages on natural boundaries", () => {
			const message = "First sentence. Second sentence. Third sentence.";
			const chunks = splitIntoHumanChunks(message, { maxChunkLength: 20 });

			expect(chunks).toContain("First sentence");
			expect(chunks.length).toBe(3);
		});

		it("should handle list items separately", () => {
			const listMessage =
				"Here are some items:\n- First item\n- Second item\n- Third item";
			const chunks = splitIntoHumanChunks(listMessage);

			expect(chunks).toContain("Here are some items:");
			expect(chunks).toContain("- First item");
			expect(chunks).toContain("- Second item");
			expect(chunks).toContain("- Third item");
		});
	});

	describe("calculateTypingDelay", () => {
		it("should return at least the minimum delay", () => {
			const shortText = "hi";
			const options: HumanTypingOptions = { minTypingDelay: 300 };

			expect(calculateTypingDelay(shortText, options)).toBeGreaterThanOrEqual(
				300,
			);
		});

		it("should increase delay for longer text", () => {
			const shortText = "hi";
			const longText =
				"This is a much longer message that would take more time to type";

			const shortDelay = calculateTypingDelay(shortText, {
				maxAdditionalDelay: 0,
			});
			const longDelay = calculateTypingDelay(longText, {
				maxAdditionalDelay: 0,
			});

			expect(longDelay).toBeGreaterThan(shortDelay);
		});
	});

	describe("humanizeText", () => {
		it("should remove periods and commas at the end", () => {
			expect(humanizeText("Hello world.")).not.toMatch(/[.,]$/);
			expect(humanizeText("Hello, world,")).not.toMatch(/[.,]$/);
		});

		it("should keep question marks and exclamation points", () => {
			expect(humanizeText("Hello world?")).toMatch(/\?$/);
			expect(humanizeText("Hello world!")).toMatch(/\!$/);
		});

		it("should provide deterministic output with zero typo rate", () => {
			const text = "This text should stay the same";
			expect(humanizeText(text, { typoRate: 0, abbreviationRate: 0 })).toEqual(
				text,
			);
		});
	});

	describe("simulateHumanTyping", () => {
		it("should return chunks and delays for a message", () => {
			const result = simulateHumanTyping("Hello, how are you today?");

			expect(result).toHaveProperty("chunks");
			expect(result).toHaveProperty("delays");
			expect(Array.isArray(result.chunks)).toBe(true);
			expect(Array.isArray(result.delays)).toBe(true);
			expect(result.chunks.length).toEqual(result.delays.length);
		});

		it("should handle multi-line messages", () => {
			const multiLineMessage = "First line\nSecond line\nThird line";
			const result = simulateHumanTyping(multiLineMessage);

			expect(result.chunks.length).toBeGreaterThanOrEqual(3);
		});

		it("should break a structured message into natural parts", () => {
			const structuredMessage =
				"Let me list some benefits:\n" +
				"1. First benefit\n" +
				"2. Second benefit\n" +
				"3. Third benefit\n\n" +
				"That's all folks!";

			const result = simulateHumanTyping(structuredMessage, {
				typoRate: 0,
				abbreviationRate: 0,
			});

			expect(result.chunks.length).toBeGreaterThanOrEqual(5);
			expect(result.chunks).toContain("Let me list some benefits:");
			expect(result.chunks[result.chunks.length - 1]).toEqual(
				"That's all folks!",
			);
		});
	});
});
