import { chunkSplitter } from "@/lib/ai-agents/chunk-splitter";
import { calculateTypingDelay } from "@/lib/human-typing-simulator";
import { logger } from "@trigger.dev/sdk";
import type { MessageChunkingOptions, MessageChunkingResult } from "./types";

/**
 * 智能分割消息为更小的块，并计算每个块的打字延迟
 *
 * 如果消息长度小于等于理想块大小，直接返回完整消息作为单个块
 * 如果消息较长，使用AI驱动的分块器来智能分割消息
 */
export async function chunkMessage(
	message: string,
	apiKey: string,
	options: MessageChunkingOptions,
): Promise<MessageChunkingResult> {
	const { idealChunkSize, minTypingDelay, maxAdditionalDelay } = options;

	// 消息足够短，直接作为单个块处理
	if (message.length <= idealChunkSize) {
		logger.info("Message short enough, using as single chunk", {
			length: message.length,
			threshold: idealChunkSize,
		});

		return {
			chunks: [message],
			delays: [
				calculateTypingDelay(message, {
					minTypingDelay,
					maxAdditionalDelay,
				}),
			],
		};
	}

	// 消息较长，使用AI进行智能分割
	logger.info("Using AI chunk splitter for long message", {
		messageLength: message.length,
		threshold: idealChunkSize,
	});

	const { chunks: rawChunks } = await chunkSplitter(
		apiKey,
		message,
		idealChunkSize,
	);

	// 处理每个消息块，确保它们不以逗号结尾
	const chunks = rawChunks.map((chunk) => {
		// 移除块结尾的逗号，因为这会中断WhatsApp的自动回复机制
		return chunk.replace(/,$/, "");
	});

	// 为每个块计算打字延迟
	const delays = chunks.map((chunk) => {
		return calculateTypingDelay(chunk, {
			minTypingDelay,
			maxAdditionalDelay,
		});
	});

	logger.info("Split message into chunks", {
		count: chunks.length,
		totalLength: message.length,
	});

	return { chunks, delays };
}
