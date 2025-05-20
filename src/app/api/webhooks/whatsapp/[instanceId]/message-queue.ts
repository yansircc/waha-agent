import {
	getRedisForInstance,
	parseJsonValueIfNeeded,
	safeRedisOperation,
	stringifyValueIfNeeded,
} from "@/lib/redis";
import type { WAMessage, WebhookNotification } from "@/types/waha";

// Redis键前缀
const MESSAGE_QUEUE_PREFIX = "message-queue:";

// 消息队列的TTL (1小时，单位：秒)
const QUEUE_TTL = 60 * 60;
// 队列稳定性检查的等待时间 (单位：毫秒)
const QUEUE_STABILITY_WAIT_TIME = 3000;

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
