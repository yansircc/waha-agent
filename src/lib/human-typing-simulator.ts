/**
 * 模拟类似人类的在聊天软件中的打字行为
 */

export interface HumanTypingOptions {
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
 * 将消息分割成类似人类的块
 */
export function splitIntoHumanChunks(
	message: string,
	options: HumanTypingOptions = {},
): string[] {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const { maxChunkLength = 120 } = opts;

	// 处理空消息
	if (!message || !message.trim()) {
		return [];
	}

	// 首先，按行分割以处理结构化内容
	const lines = message.split(/\n+/);

	// 然后，将每行分割成块
	const chunks: string[] = [];

	for (const line of lines) {
		// 跳过空行
		if (!line.trim()) continue;

		// 如果行包含列表项，将每个列表项视为单独的块
		if (line.match(/^[-*•]\s+/) || line.match(/^\d+[.)]\s+/)) {
			chunks.push(line.trim());
			continue;
		}

		// 如果行足够短，直接添加为一个块
		if (line.length <= maxChunkLength) {
			chunks.push(line.trim());
			continue;
		}

		// 处理需要分割的长行
		let remaining = line;
		while (remaining.length > 0) {
			// 如果剩余文本已经很短，直接添加
			if (remaining.length <= maxChunkLength) {
				chunks.push(remaining.trim());
				break;
			}

			// 定义潜在的断点类型和优先级
			// 1. 句子结束（句号、问号、感叹号后跟空格或结束）
			// 2. 从句（分号、冒号后跟空格）
			// 3. 短语（逗号后跟空格）
			// 4. 任何空格

			// 首先尝试找理想长度范围内的最佳断点
			const searchEndPos = Math.min(remaining.length, maxChunkLength + 20);
			const searchText = remaining.substring(0, searchEndPos);

			// 寻找各类断点的最后位置
			const sentenceEnd = findLastMatch(
				searchText,
				/[.!?。！？]\s+|[.!?。！？]$/,
			);
			const clauseEnd = findLastMatch(searchText, /[:;]\s+/);
			const phraseEnd = findLastMatch(searchText, /[,，、]\s+/);
			const spacePos = searchText.lastIndexOf(" ");

			let breakPos = -1;

			// 按优先级选择断点
			if (sentenceEnd >= maxChunkLength / 3) {
				// 如果找到句子结束且长度合理，优先使用
				breakPos = sentenceEnd;
			} else if (clauseEnd >= maxChunkLength / 3) {
				// 如果找到从句结束且长度合理，使用从句
				breakPos = clauseEnd;
			} else if (phraseEnd >= maxChunkLength / 3) {
				// 如果找到短语结束且长度合理，使用短语
				breakPos = phraseEnd;
			} else if (spacePos >= maxChunkLength / 3) {
				// 使用最后的空格位置
				breakPos = spacePos;
			}

			// 如果找不到任何好的断点，就在最大长度处或稍微超过处截断
			if (breakPos === -1 || breakPos < maxChunkLength / 3) {
				// 尝试在超出范围内找一个最近的空格
				const extendedSearch = remaining.substring(
					0,
					Math.min(remaining.length, maxChunkLength * 1.5),
				);
				const nextSpace = extendedSearch.indexOf(" ", maxChunkLength);

				if (nextSpace !== -1 && nextSpace < maxChunkLength * 1.2) {
					// 找到了接近限制的空格，使用它
					breakPos = nextSpace;
				} else {
					// 找不到任何好的位置，强制在最大长度处截断或使用整个剩余文本
					breakPos = Math.min(maxChunkLength, remaining.length);
				}
			}

			// 检查括号、引号的完整性
			breakPos = ensureClosedParentheses(remaining, breakPos);

			// 提取当前块
			const currentChunk = remaining.substring(0, breakPos).trim();
			if (currentChunk) {
				chunks.push(currentChunk);
			}

			// 更新剩余文本
			remaining = remaining.substring(breakPos).trim();
		}
	}

	// 移除每个块末尾的句号和逗号（除了最后一个块）
	return chunks.map((chunk, i) => {
		if (i === chunks.length - 1) return chunk;
		return chunk.replace(/[.,]+$/, "");
	});
}

/**
 * 在文本中查找最后一个匹配模式的位置
 * 返回匹配结束位置
 */
function findLastMatch(text: string, pattern: RegExp): number {
	const matches = [...text.matchAll(new RegExp(pattern, "g"))];
	if (matches.length === 0) return -1;

	const lastMatch = matches[matches.length - 1];
	if (!lastMatch || lastMatch.index === undefined) return -1;

	return lastMatch.index + lastMatch[0].length;
}

/**
 * 确保括号和引号的完整性
 * 如果断点在未闭合的括号或引号内，尝试调整位置
 */
function ensureClosedParentheses(text: string, breakPos: number): number {
	const textToBreak = text.substring(0, breakPos);

	// 检查括号是否配对
	const openParens = (textToBreak.match(/\(/g) || []).length;
	const closeParens = (textToBreak.match(/\)/g) || []).length;

	// 检查引号是否成对
	const quotes = (textToBreak.match(/"/g) || []).length;

	// 如果括号或引号不配对
	if (openParens !== closeParens || quotes % 2 !== 0) {
		// 尝试找到下一个闭合位置
		let adjustedPos = breakPos;

		// 处理括号不平衡
		if (openParens > closeParens) {
			const nextCloseParen = text.indexOf(")", breakPos);
			if (nextCloseParen !== -1 && nextCloseParen < breakPos + 50) {
				adjustedPos = Math.max(adjustedPos, nextCloseParen + 1);
			}
		}

		// 处理引号不平衡
		if (quotes % 2 !== 0) {
			const nextQuote = text.indexOf('"', breakPos);
			if (nextQuote !== -1 && nextQuote < breakPos + 50) {
				adjustedPos = Math.max(adjustedPos, nextQuote + 1);
			}
		}

		return adjustedPos;
	}

	return breakPos;
}

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
 * 通过可能添加拼写错误、非正式语言等来使文本更人性化
 */
export function humanizeText(
	text: string,
	options: HumanTypingOptions = {},
): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const { typoRate = 0.05, abbreviationRate = 0.2 } = opts;

	let result = text;

	// 将句号和逗号末尾转换为空，但保留 ? 和 !
	result = result.replace(/[.,]+$/, "");

	// 决定是否引入拼写错误 - 基于概率随机决定
	if (Math.random() < typoRate) {
		// 如果文本足够长，随机选择一个位置引入一个拼写错误
		if (result.length > 2) {
			// 简单的拼写错误类型：
			const errorTypes = [
				// 1. 调换相邻字母
				() => {
					const pos = Math.floor(Math.random() * (result.length - 1));
					return (
						result.substring(0, pos) +
						result.charAt(pos + 1) +
						result.charAt(pos) +
						result.substring(pos + 2)
					);
				},
				// 2. 漏掉一个字母
				() => {
					const pos = Math.floor(Math.random() * result.length);
					return result.substring(0, pos) + result.substring(pos + 1);
				},
				// 3. 重复一个字母
				() => {
					const pos = Math.floor(Math.random() * result.length);
					return (
						result.substring(0, pos) +
						result.charAt(pos) +
						result.substring(pos)
					);
				},
			];

			// 随机选择一种错误类型
			const errorTypeIndex = Math.floor(Math.random() * errorTypes.length);
			const errorFn = errorTypes[errorTypeIndex];
			if (errorFn) {
				result = errorFn();
			}
		}
	}

	// 决定是否使用缩写 - 基于概率随机决定
	if (Math.random() < abbreviationRate) {
		const replacements: Record<string, string> = {
			you: "u",
			your: "ur",
			are: "r",
			for: "4",
			to: "2",
			too: "2",
			be: "b",
			please: "pls",
			thanks: "thx",
			"thank you": "thanks",
			with: "w/",
			without: "w/o",
		};

		// 找出文本中所有可以被替换的单词
		const words = Object.keys(replacements).filter((word) => {
			const regex = new RegExp(`\\b${word}\\b`, "i");
			return regex.test(result);
		});

		// 如果有可替换的单词，随机选择一个进行替换
		if (words.length > 0) {
			const randomIndex = Math.floor(Math.random() * words.length);
			const wordToReplace = words[randomIndex];
			if (wordToReplace) {
				const regex = new RegExp(`\\b${wordToReplace}\\b`, "i");
				const replacement = replacements[wordToReplace];
				if (replacement) {
					result = result.replace(regex, replacement);
				}
			}
		}
	}

	return result;
}

/**
 * 通过将消息分割成块并添加适当的延迟和类似人类的特征来模拟人类的打字行为
 */
export function simulateHumanTyping(
	message: string,
	options: HumanTypingOptions = {},
): {
	chunks: string[];
	delays: number[];
} {
	const chunks = splitIntoHumanChunks(message, options);

	// 使每个块更人性化
	const humanizedChunks = chunks.map((chunk) => humanizeText(chunk, options));

	// 计算打字延迟
	const delays = humanizedChunks.map((chunk) =>
		calculateTypingDelay(chunk, options),
	);

	return {
		chunks: humanizedChunks,
		delays,
	};
}
