import { chatGenerationTask } from "@/trigger/chat-generation";

/**
 * 触发聊天生成任务
 *
 * 将聊天生成任务发送到Trigger.dev以执行AI响应生成
 */
export async function triggerChatGeneration({
	messages,
	agentId,
	userId,
	webhookUrl,
	conversationId,
}: {
	messages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	agentId?: string;
	userId: string;
	webhookUrl?: string;
	conversationId?: string;
}) {
	const handle = await chatGenerationTask.trigger({
		messages,
		agentId,
		userId,
		webhookUrl,
		conversationId,
	});

	return {
		taskId: handle.id,
		status: "processing",
	};
}
