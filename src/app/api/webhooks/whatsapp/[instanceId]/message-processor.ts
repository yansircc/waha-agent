import {
	isAgentIdle,
	markAgentIdle,
	markAgentProcessing,
} from "./agent-status";
import {
	type MessageQueueItem,
	dequeueAllMessages,
	getQueueLength,
	isQueueStable,
} from "./message-queue";

/**
 * 消息处理结果
 */
interface MessageProcessResult {
	shouldProcess: boolean;
	messages: MessageQueueItem[];
	combinedContent: string;
	firstMessage: MessageQueueItem | null;
}

/**
 * 合并消息内容
 */
function combineMessages(messages: MessageQueueItem[]): string {
	return messages
		.map((item) => item.messageData.body || "")
		.filter(Boolean)
		.join("\n");
}

/**
 * 检查并处理消息队列
 * 只有当队列稳定且Agent空闲时才处理
 */
export async function processQueuedMessages(
	instanceId: string,
	chatId: string,
	initialQueueLength: number,
): Promise<MessageProcessResult> {
	// 1. 检查队列是否稳定
	const isStable = await isQueueStable(instanceId, chatId, initialQueueLength);
	if (!isStable) {
		console.log("队列不稳定，用户可能正在输入更多消息");
		return {
			shouldProcess: false,
			messages: [],
			combinedContent: "",
			firstMessage: null,
		};
	}

	// 2. 检查Agent是否空闲
	const agentIdle = await isAgentIdle(instanceId, chatId);
	if (!agentIdle) {
		console.log("Agent正在处理其他消息，稍后再尝试");
		return {
			shouldProcess: false,
			messages: [],
			combinedContent: "",
			firstMessage: null,
		};
	}

	// 3. 设置Agent状态为处理中
	await markAgentProcessing(instanceId, chatId);

	// 4. 处理队列
	const { messages, success } = await dequeueAllMessages(instanceId, chatId);

	// 如果处理失败或没有消息，重置Agent状态
	if (!success || messages.length === 0) {
		await markAgentIdle(instanceId, chatId);
		return {
			shouldProcess: false,
			messages: [],
			combinedContent: "",
			firstMessage: null,
		};
	}

	// 合并消息内容
	const combinedContent = combineMessages(messages);

	// 确保firstMessage有类型安全的处理
	const firstMessage = messages.length > 0 ? messages[0] : null;

	if (!firstMessage) {
		// 理论上不应该发生，因为前面已经检查了messages.length > 0
		await markAgentIdle(instanceId, chatId);
		return {
			shouldProcess: false,
			messages: [],
			combinedContent: "",
			firstMessage: null,
		};
	}

	return {
		shouldProcess: true,
		messages,
		combinedContent,
		firstMessage,
	};
}

/**
 * 处理Agent完成后的队列检查
 * 如果队列中有剩余消息，通知需要再次处理
 */
export async function checkQueueAfterCompletion(
	instanceId: string,
	chatId: string,
): Promise<{
	hasMessages: boolean;
	queueLength: number;
}> {
	// 获取当前队列长度
	const queueLength = await getQueueLength(instanceId, chatId);

	// 检查是否有消息
	const hasMessages = queueLength > 0;

	if (hasMessages) {
		console.log(`检测到队列中还有 ${queueLength} 条待处理消息`);
	}

	return {
		hasMessages,
		queueLength,
	};
}
