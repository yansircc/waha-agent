import { getRedisForInstance, safeRedisOperation } from "@/lib/redis";

// Redis键前缀
const AGENT_STATUS_PREFIX = "agent-status:";

/**
 * Agent处理状态
 */
enum AgentStatus {
	IDLE = "idle", // 空闲，可以处理新消息
	PROCESSING = "processing", // 正在处理消息
}

/**
 * 获取Agent状态键
 */
function getAgentStatusKey(instanceId: string, chatId: string): string {
	return `${AGENT_STATUS_PREFIX}${instanceId}:${chatId}`;
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
 * 判断Agent是否空闲
 */
export async function isAgentIdle(
	instanceId: string,
	chatId: string,
): Promise<boolean> {
	const status = await getAgentStatus(instanceId, chatId);
	return status === AgentStatus.IDLE;
}

/**
 * 标记Agent为空闲状态
 */
export async function markAgentIdle(
	instanceId: string,
	chatId: string,
): Promise<boolean> {
	return await setAgentStatus(instanceId, chatId, AgentStatus.IDLE);
}

/**
 * 标记Agent为处理中状态
 */
export async function markAgentProcessing(
	instanceId: string,
	chatId: string,
): Promise<boolean> {
	return await setAgentStatus(instanceId, chatId, AgentStatus.PROCESSING);
}
