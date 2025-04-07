import { processDocumentTask } from "@/trigger/embedding";

/**
 * 触发文档处理任务
 *
 * 将文档处理任务发送到Trigger.dev以执行耗时的分块和嵌入操作
 * 嵌入现在由Trigger.dev直接存储到数据库中
 */
export async function triggerDocumentProcessing({
	content,
	knowledgeBaseId,
	documentName,
	userId,
	documentId,
	webhookUrl,
}: {
	content: string;
	knowledgeBaseId: string;
	documentName: string;
	userId: string;
	documentId: string;
	webhookUrl?: string; // 现在是可选的，因为嵌入直接存储到数据库
}) {
	// 触发任务并返回句柄
	const handle = await processDocumentTask.trigger({
		content,
		knowledgeBaseId,
		documentName,
		userId,
		documentId,
		webhookUrl, // 如果提供了webhook URL，将通知处理结果
	});

	// 返回任务句柄ID以便跟踪
	return {
		taskId: handle.id,
		status: "triggered",
	};
}
