import { chunkSplitter } from "@/lib/ai-agents/chunk-splitter";
import { logger } from "@trigger.dev/sdk";
import type { MessageChunkingOptions, MessageChunkingResult } from "./types";

/**
 * 模拟类似人类的在聊天软件中的打字行为
 */

interface HumanTypingOptions {
	/**
	 * 每个消息块的最大字符数
	 * @default 120
	 */
	maxChunkLength?: number;

	/**
	 * 最小打字延迟（毫秒）
	 * @default 500
	 */
	minTypingDelay?: number;

	/**
	 * 最大额外随机打字延迟（毫秒）
	 * @default 1500
	 */
	maxAdditionalDelay?: number;

	/**
	 * 包含拼写错误的概率（0-1）
	 * @default 0.05
	 */
	typoRate?: number;

	/**
	 * 使用非正式缩写的概率（0-1）
	 * @default 0.2
	 */
	abbreviationRate?: number;
}

const DEFAULT_OPTIONS: HumanTypingOptions = {
	maxChunkLength: 120,
	minTypingDelay: 500,
	maxAdditionalDelay: 1500,
	typoRate: 0.05,
	abbreviationRate: 0.2,
};

/**
 * 计算给定文本块的打字延迟
 */
export function calculateTypingDelay(
	text: string,
	options: HumanTypingOptions = {},
): number {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const { minTypingDelay = 500, maxAdditionalDelay = 1500 } = opts;

	// Assuming average typing speed of 40 WPM (~200 characters/minute)
	// 如果要调速度，可以调整 60 / x，x 越大，速度越快，反之亦然
	const baseDelay = text.length * (60 / 400) * 1000;

	// Add random variable to make it more natural
	// Reduce the random delay to be more reasonable
	const randomDelay = Math.random() * Math.min(maxAdditionalDelay, 1000);

	return Math.max(minTypingDelay, baseDelay + randomDelay);
}

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

	// 处理每个消息块，确保它们不以逗号或句号结尾
	const chunks = rawChunks.map((chunk) => {
		// 移除块结尾的逗号和句号，因为这会中断WhatsApp的自动回复机制
		return chunk.replace(/[,.]$/, "");
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
