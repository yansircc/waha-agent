import {
	getRedisForInstance,
	parseJsonValueIfNeeded,
	safeRedisOperation,
	stringifyValueIfNeeded,
} from "@/lib/redis";
import type { WAMessage, WebhookNotification } from "@/types/api-responses";

// Redis键前缀
const MESSAGE_QUEUE_PREFIX = "message-queue:";
const AGENT_STATUS_PREFIX = "agent-status:";

// 消息队列的TTL (1小时，单位：秒)
const QUEUE_TTL = 60 * 60;
// 队列稳定性检查的等待时间 (单位：毫秒)
const QUEUE_STABILITY_WAIT_TIME = 3000;

/**
 * Agent处理状态
 */
enum AgentStatus {
	IDLE = "idle", // 空闲，可以处理新消息
	PROCESSING = "processing", // 正在处理消息
}

/**
 * 消息队列项
 */
export interface MessageQueueItem {
	messageData: Partial<WAMessage>;
	body: WebhookNotification;
	timestamp: number;
}

/**
 * 获取消息队列键
 */
function getQueueKey(instanceId: string, chatId: string): string {
	return `${MESSAGE_QUEUE_PREFIX}${instanceId}:${chatId}`;
}

/**
 * 获取Agent状态键
 */
function getAgentStatusKey(instanceId: string, chatId: string): string {
	return `${AGENT_STATUS_PREFIX}${instanceId}:${chatId}`;
}

/**
 * 添加消息到队列
 */
export async function enqueueMessage(
	instanceId: string,
	chatId: string,
	messageData: Partial<WAMessage>,
	body: WebhookNotification,
): Promise<{ success: boolean; queueLength: number }> {
	try {
		const redis = getRedisForInstance(instanceId);
		const queueKey = getQueueKey(instanceId, chatId);

		// 创建队列项
		const queueItem: MessageQueueItem = {
			messageData,
			body,
			timestamp: Date.now(),
		};

		// 添加到队列
		await safeRedisOperation(() =>
			redis.lpush(queueKey, stringifyValueIfNeeded(queueItem)),
		);

		// 设置TTL
		await safeRedisOperation(() => redis.expire(queueKey, QUEUE_TTL));

		// 获取队列长度
		const queueLength = await safeRedisOperation(() => redis.llen(queueKey));

		console.log(`已添加消息到队列，当前队列长度: ${queueLength}`);
		return { success: true, queueLength: queueLength || 0 };
	} catch (error) {
		console.error("添加消息到队列失败:", error);
		return { success: false, queueLength: 0 };
	}
}

/**
 * 获取队列中的所有消息并清空队列
 */
export async function dequeueAllMessages(
	instanceId: string,
	chatId: string,
): Promise<{
	messages: MessageQueueItem[];
	success: boolean;
}> {
	try {
		const redis = getRedisForInstance(instanceId);
		const queueKey = getQueueKey(instanceId, chatId);

		// 获取队列中的所有消息
		const queueData = await safeRedisOperation(() =>
			redis.lrange(queueKey, 0, -1),
		);

		if (!queueData || queueData.length === 0) {
			return {
				messages: [],
				success: true,
			};
		}

		// 解析消息
		const messageItems: MessageQueueItem[] = queueData
			.map((item) => parseJsonValueIfNeeded(item) as MessageQueueItem)
			.sort((a, b) => a.timestamp - b.timestamp); // 按时间顺序排序

		// 清空队列
		await safeRedisOperation(() => redis.del(queueKey));

		console.log(`已获取并清空队列中的 ${messageItems.length} 条消息`);
		return {
			messages: messageItems,
			success: true,
		};
	} catch (error) {
		console.error("获取队列消息失败:", error);
		return {
			messages: [],
			success: false,
		};
	}
}

/**
 * 获取队列长度
 */
export async function getQueueLength(
	instanceId: string,
	chatId: string,
): Promise<number> {
	try {
		const redis = getRedisForInstance(instanceId);
		const queueKey = getQueueKey(instanceId, chatId);
		const length = await safeRedisOperation(() => redis.llen(queueKey));
		return length || 0;
	} catch (error) {
		console.error("获取队列长度失败:", error);
		return 0;
	}
}

/**
 * 清空队列
 */
async function clearQueue(
	instanceId: string,
	chatId: string,
): Promise<boolean> {
	try {
		const redis = getRedisForInstance(instanceId);
		const queueKey = getQueueKey(instanceId, chatId);
		await safeRedisOperation(() => redis.del(queueKey));
		console.log("已清空队列");
		return true;
	} catch (error) {
		console.error("清空队列失败:", error);
		return false;
	}
}

/**
 * 检查队列是否稳定（一段时间内没有新消息）
 */
export async function isQueueStable(
	instanceId: string,
	chatId: string,
	initialQueueLength: number,
): Promise<boolean> {
	// 等待指定时间
	await new Promise((resolve) =>
		setTimeout(resolve, QUEUE_STABILITY_WAIT_TIME),
	);

	// 再次检查队列长度
	const currentQueueLength = await getQueueLength(instanceId, chatId);

	console.log(
		`队列稳定性检查: 初始长度=${initialQueueLength}, 当前长度=${currentQueueLength}`,
	);

	// 如果队列长度没有变化，说明队列稳定
	return currentQueueLength === initialQueueLength;
}

/**
 * 获取Agent状态
 */
async function getAgentStatus(
	instanceId: string,
	chatId: string,
): Promise<AgentStatus> {
	try {
		const redis = getRedisForInstance(instanceId);
		const statusKey = getAgentStatusKey(instanceId, chatId);

		// 获取状态
		const status = await safeRedisOperation(() => redis.get(statusKey));

		if (!status) {
			return AgentStatus.IDLE;
		}

		return status as AgentStatus;
	} catch (error) {
		console.error("获取Agent状态失败:", error);
		return AgentStatus.IDLE;
	}
}

/**
 * 设置Agent状态
 */
async function setAgentStatus(
	instanceId: string,
	chatId: string,
	status: AgentStatus,
): Promise<boolean> {
	try {
		const redis = getRedisForInstance(instanceId);
		const statusKey = getAgentStatusKey(instanceId, chatId);

		// 保存状态
		await safeRedisOperation(() => redis.set(statusKey, status));

		console.log(`已设置Agent状态为: ${status}`);
		return true;
	} catch (error) {
		console.error("设置Agent状态失败:", error);
		return false;
	}
}

/**
 * 检查并处理消息队列
 * 只有当队列稳定且Agent空闲时才处理
 */
async function checkAndProcessQueue(
	instanceId: string,
	chatId: string,
	initialQueueLength: number,
): Promise<{
	shouldProcess: boolean;
	messages: MessageQueueItem[];
	combinedContent: string;
	firstMessage: MessageQueueItem | null;
}> {
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
	const agentStatus = await getAgentStatus(instanceId, chatId);
	if (agentStatus !== AgentStatus.IDLE) {
		console.log("Agent正在处理其他消息，稍后再尝试");
		return {
			shouldProcess: false,
			messages: [],
			combinedContent: "",
			firstMessage: null,
		};
	}

	// 3. 设置Agent状态为处理中
	await setAgentStatus(instanceId, chatId, AgentStatus.PROCESSING);

	// 4. 处理队列
	const { messages, success } = await dequeueAllMessages(instanceId, chatId);

	// 如果处理失败或没有消息，重置Agent状态
	if (!success || messages.length === 0) {
		await setAgentStatus(instanceId, chatId, AgentStatus.IDLE);
		return {
			shouldProcess: false,
			messages: [],
			combinedContent: "",
			firstMessage: null,
		};
	}

	// 合并消息内容
	const combinedContent = messages
		.map((item) => item.messageData.body || "")
		.filter(Boolean)
		.join("\n");

	return {
		shouldProcess: true,
		messages,
		combinedContent,
		firstMessage: messages[0] || null,
	};
}

/**
 * 标记Agent处理完成
 */
async function markAgentCompleted(
	instanceId: string,
	chatId: string,
): Promise<boolean> {
	return await setAgentStatus(instanceId, chatId, AgentStatus.IDLE);
}
