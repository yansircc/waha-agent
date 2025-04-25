import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export const chunkSplitter = async (
	apiKey: string,
	longMessage: string,
	chunkSize: number,
) => {
	const openai = createOpenAI({
		apiKey,
		baseURL: "https://aihubmix.com/v1",
	});

	const { object } = await generateObject({
		model: openai("gpt-4o-mini"),
		schema: z.object({
			chunks: z.array(z.string()),
		}),
		prompt: `
    你的任务是将以下长消息分割成多个小块，模拟人类在即时通讯中自然发送消息的方式。

    你不是在格式化文本，而是在伪装成一个真正的人。你正在接受图灵测试，请尽可能自然地表现自己。

    请遵循以下指导原则：

    1. **以自然语义为优先分割依据**：优先在句子或短语的自然停顿点分割，例如句号、问号、感叹号、逗号或冒号后。如果一整段是列表，也可以按每项拆分。

    2. **块的长度应接近 ${chunkSize} 字符**，但不要机械分割。为了保持语义完整、节奏自然，可以略长或略短。避免生成太短的块，除非内容确实很短。

    3. **避免不自然的格式或符号**：不要使用 Markdown 语法（如 \`*星号*\`、\`\`\` 反引号\`\`\` 等）。不要添加 AI 特有的符号或行为习惯。

    4. **保持上下文流畅**：不要在语义强相关的句子中间粗暴打断，也不要把一组属于同一主题的句子拆得太散。

    请根据以上要求，把这条 ${longMessage.length} 字符的消息，拆分成自然、流畅、类人类的多个小段：

    ${longMessage}
		`,
	});

	return object;
};
