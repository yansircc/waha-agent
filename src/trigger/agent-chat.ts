import {
	type KbSearcherPayload,
	kbSearcher,
} from "@/lib/ai-agents/kb-searcher";
import { logger, task } from "@trigger.dev/sdk";
import type { AgentChatPayload, ChatWebhookResponse } from "./types";
import { sendWebhookResponse } from "./utils";

export const agentChat = task({
	id: "agent-chat",
	run: async (payload: AgentChatPayload) => {
		const { messages, agent, conversationId, webhookUrl, messageId } = payload;

		try {
			// Log start of processing
			logger.info("开始聊天生成", {
				agentId: agent.id,
				kbIds: agent.kbIds,
				conversationId,
				messageId,
				messageCount: messages.length,
			});

			const kbSearcherPayload: KbSearcherPayload = {
				messages: messages.map((message) => ({
					role: message.role,
					content: message.content,
				})),
				agent,
			};

			// 调用已更新的vercelAIAgent函数(内部已包含混合搜索逻辑)
			const result = await kbSearcher(kbSearcherPayload);

			// Prepare webhook response
			const webhookData: ChatWebhookResponse = {
				success: true,
				response: result.text,
				messages: [...messages, { role: "assistant", content: result.text }],
				agent,
				conversationId,
				messageId,
			};

			// Log success
			logger.info("聊天生成完成", {
				agent,
				conversationId,
				messageId,
				messageCount: messages.length,
				responseLength: result.text.length,
			});

			// Send webhook response
			logger.debug("发送webhook响应", {
				url: webhookUrl,
				success: true,
			});

			await sendWebhookResponse<ChatWebhookResponse>(webhookUrl, webhookData);

			return webhookData;
		} catch (error) {
			// Prepare error response
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const errorResponse: ChatWebhookResponse = {
				success: false,
				error: errorMessage,
				agent,
				conversationId,
				messageId,
			};

			// Log error
			logger.error("聊天生成失败", {
				error: errorMessage,
				agent,
				conversationId,
				messageId,
			});

			// Send error webhook response
			logger.debug("发送错误webhook响应", {
				url: webhookUrl,
				success: false,
			});

			await sendWebhookResponse<ChatWebhookResponse>(webhookUrl, errorResponse);

			return errorResponse;
		}
	},
});
