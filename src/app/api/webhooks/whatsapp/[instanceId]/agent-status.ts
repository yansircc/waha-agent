import { getRedisForInstance, safeRedisOperation } from "@/lib/redis";
import { catchError } from "react-catch-error";

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
	const redis = getRedisForInstance(instanceId);
	const statusKey = getAgentStatusKey(instanceId, chatId);

	// 保存状态
	const { error: setError, data: setData } = await catchError(async () =>
		redis.set(statusKey, status),
	);

	if (setError || !setData) {
		console.error("设置Agent状态失败:", setError);
		return false;
	}
	console.log(`已设置Agent状态为: ${status}`);
	return true;
}

/**
 * 获取Agent状态
 */
export async function getAgentStatus(
	instanceId: string,
	chatId: string,
): Promise<AgentStatus> {
	const redis = getRedisForInstance(instanceId);
	const statusKey = getAgentStatusKey(instanceId, chatId);

	// 获取状态
	const { error: getError, data: status } = await catchError(async () =>
		redis.get(statusKey),
	);

	if (getError || !status) {
		console.error("获取Agent状态失败:", getError);
		return AgentStatus.IDLE;
	}

	return status as AgentStatus;
}

/**
 * 标记Agent为空闲状态
 */
export async function markAgentIdle(
	instanceId: string,
	chatId: string,
): Promise<boolean> {
	const { error: setError, data: setData } = await catchError(async () =>
		setAgentStatus(instanceId, chatId, AgentStatus.IDLE),
	);

	if (setError || !setData) {
		console.error("设置Agent状态失败:", setError);
		return false;
	}

	return true;
}

/**
 * 标记Agent为处理中状态
 */
export async function markAgentProcessing(
	instanceId: string,
	chatId: string,
): Promise<boolean> {
	const { error: setError, data: setData } = await catchError(async () =>
		setAgentStatus(instanceId, chatId, AgentStatus.PROCESSING),
	);

	if (setError || !setData) {
		console.error("设置Agent状态失败:", setError);
		return false;
	}

	return true;
}
