import { env } from "@/env";
import { kbPreprocessor } from "../ai-agents/kb-preprocessor";
import type { JinaCrawlResult } from "./types";

/**
 * 处理爬取结果，对内容进行AI清洗
 * @param result 爬取结果
 * @returns 处理后的爬取结果
 */
export async function processResult(
	result: JinaCrawlResult,
): Promise<JinaCrawlResult> {
	if (!result.success || !result.content) {
		return result;
	}

	const cleanedContent = await kbPreprocessor(
		env.AI_HUB_MIX_API_KEY,
		result.content,
	);

	console.log(
		`清洗前后的内容长度对比: ${result.content.length} -> ${cleanedContent.length}`,
	);

	return {
		...result,
		content: cleanedContent,
	};
}
