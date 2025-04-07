import { mastra } from "@/mastra";
import { logger, task } from "@trigger.dev/sdk/v3";

interface ChatGenerationPayload {
	messages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	agentId?: string;
	userId: string;
	webhookUrl?: string;
	conversationId?: string;
}

export const chatGenerationTask = task({
	id: "chat-generation",
	maxDuration: 300, // 5 minutes max duration

	run: async (payload: ChatGenerationPayload) => {
		const { messages, agentId, userId, webhookUrl, conversationId } = payload;

		logger.log("Starting chat generation", {
			userId,
			agentId: agentId || "default",
			messagesCount: messages.length,
		});

		try {
			// 获取最后一条用户消息作为查询内容
			const lastMessage = messages[messages.length - 1];
			if (!lastMessage || lastMessage.role !== "user" || !lastMessage.content) {
				throw new Error(
					"Invalid request: last message must be from user with content",
				);
			}

			// 默认使用研究型agent，如果提供了自定义agentId则使用指定的
			// const mastraAgentId = agentId || "researchAgent";
			const mastraAgentId = "researchAgent"; // TODO: 测试用

			// 使用mastra库生成回复
			const mastraAgent = mastra.getAgent(mastraAgentId);

			logger.log("Generating response with agent", {
				agentId: mastraAgentId,
				messageContent: `${lastMessage.content.substring(0, 100)}...`,
			});

			const response = await mastraAgent.generate(lastMessage.content);

			logger.log("Response generated successfully", {
				responseLength: response.text.length,
			});

			// 构建包含新助手回复的完整消息列表
			const updatedMessages = [
				...messages,
				{ role: "assistant" as const, content: response.text },
			];

			// 如果提供了webhook URL，通知结果
			if (webhookUrl) {
				await fetch(webhookUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						success: true,
						response: response.text,
						messages: updatedMessages,
						userId,
						agentId: mastraAgentId,
						conversationId,
					}),
				});

				logger.log("Webhook notification sent", { webhookUrl });
			}

			return {
				success: true,
				response: response.text,
				messages: updatedMessages,
			};
		} catch (error) {
			logger.error("Error generating chat response", {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});

			// 如果提供了webhook URL，通知失败
			if (webhookUrl) {
				await fetch(webhookUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						success: false,
						error: error instanceof Error ? error.message : String(error),
						userId,
						agentId: agentId || "researchAgent",
						conversationId,
					}),
				});
			}

			throw error;
		}
	},
});
