import { getInstanceAgentFromDb } from "@/lib/db-utils";
import { parseJsonValueIfNeeded, redis, safeRedisOperation } from "@/lib/redis";
import type { Agent } from "@/types/agents";

// Redis键前缀，用于命名空间隔离
const INSTANCE_PREFIX = "instance:";
const AGENT_PREFIX = "agent:";
export const CHAT_CONTROL_PREFIX = "chat-control:";
const BOT_PHONE_PREFIX = "bot-phone:";

// 扩展Agent类型，添加活动状态标记
export interface AgentWithState extends Agent {
	isActive: boolean;
}

/**
 * 保存实例的机器人配置到Redis
 */
export async function saveInstanceAgent(
	instanceId: string,
	agent: Agent | null,
	isActive = true, // 默认为激活状态
) {
	try {
		const key = `${INSTANCE_PREFIX}${instanceId}:agent`;

		if (agent) {
			// 扩展机器人配置，添加活动状态
			const agentWithState: AgentWithState = {
				...agent,
				isActive,
			};

			// 保存机器人配置
			await safeRedisOperation(() =>
				redis.set(key, JSON.stringify(agentWithState)),
			);
			console.log(
				`保存实例 ${instanceId} 的机器人配置到Redis成功 (isActive: ${isActive})`,
			);
		} else {
			// 如果agent为null，移除配置
			await safeRedisOperation(() => redis.del(key));
			console.log(`移除实例 ${instanceId} 的机器人配置`);
		}

		return true;
	} catch (error) {
		console.error(`保存实例 ${instanceId} 的机器人配置失败:`, error);
		return false;
	}
}

/**
 * 从Redis获取实例的机器人配置
 * 如果Redis中没有，会尝试从数据库加载并存入Redis
 */
export async function getInstanceAgent(
	instanceId: string,
): Promise<AgentWithState | null> {
	try {
		const key = `${INSTANCE_PREFIX}${instanceId}:agent`;

		// 获取机器人配置
		const agentData = await safeRedisOperation(() => redis.get(key));

		if (!agentData) {
			console.log(
				`实例 ${instanceId} 在Redis中没有关联的机器人配置，尝试从数据库获取`,
			);

			// 尝试从数据库获取机器人
			const dbAgent = await getInstanceAgentFromDb(instanceId);

			if (dbAgent) {
				console.log(`从数据库找到实例 ${instanceId} 的机器人配置，保存到Redis`);

				// 保存到Redis并返回
				const agentWithState: AgentWithState = {
					...dbAgent,
					isActive: true, // 默认为激活状态
				};

				await saveInstanceAgent(instanceId, dbAgent, true);
				return agentWithState;
			}

			console.log(`实例 ${instanceId} 没有关联的机器人配置`);
			return null;
		}

		// 解析机器人配置
		const agent = parseJsonValueIfNeeded(agentData) as AgentWithState;

		// 确保isActive字段存在
		if (agent.isActive === undefined) {
			agent.isActive = true; // 默认为激活状态
		}

		return agent;
	} catch (error) {
		console.error(`获取实例 ${instanceId} 的机器人配置失败:`, error);
		return null;
	}
}

/**
 * 设置特定聊天的机器人活动状态
 * 支持单独控制每个聊天的AI回复开关
 */
export async function setChatAgentActive(
	instanceId: string,
	chatId: string,
	isActive: boolean,
): Promise<boolean> {
	try {
		// 构建聊天控制键
		const key = `${CHAT_CONTROL_PREFIX}${instanceId}:${chatId}:active`;
		const value = isActive ? "1" : "0";

		// 保存聊天的AI激活状态
		await safeRedisOperation(() => redis.set(key, value));

		console.log(
			`已将聊天 ${chatId} 的机器人控制状态设置为: ${isActive ? "激活" : "禁用"} (聊天级别设置)`,
		);
		return true;
	} catch (error) {
		console.error(`设置聊天 ${chatId} 的机器人活动状态失败:`, error);
		return false;
	}
}

/**
 * 获取特定聊天的机器人活动状态
 * 如果没有特定设置，默认为全局设置
 */
export async function getChatAgentActive(
	instanceId: string,
	chatId: string,
): Promise<boolean> {
	try {
		// 构建聊天控制键
		const key = `${CHAT_CONTROL_PREFIX}${instanceId}:${chatId}:active`;

		// 获取聊天特定的AI激活状态
		const chatActive = await safeRedisOperation(() => redis.get(key));

		// 如果存在聊天特定设置，使用它
		if (chatActive !== null) {
			// 支持字符串"1"和数字1作为激活状态
			const isActive = chatActive === "1" || chatActive === 1;
			console.log(
				`聊天 ${chatId} 的特定机器人控制状态为: ${isActive ? "激活" : "禁用"}`,
			);
			return isActive;
		}

		// 否则获取实例的全局设置
		const agent = await getInstanceAgent(instanceId);
		const instanceActive = agent?.isActive ?? true;

		return instanceActive;
	} catch (error) {
		console.error(`获取聊天 ${chatId} 的机器人活动状态失败:`, error);
		// 默认激活
		return true;
	}
}

/**
 * 设置机器人的活动状态 (实例级别)
 * 为保持向后兼容性保留，但推荐使用 setChatAgentActive
 */
export async function setAgentActive(
	instanceId: string,
	isActive: boolean,
): Promise<boolean> {
	try {
		// 先获取现有配置
		const agent = await getInstanceAgent(instanceId);

		// 如果没有配置，无法更新
		if (!agent) {
			console.log(`实例 ${instanceId} 没有机器人配置，无法设置活动状态`);
			return false;
		}

		// 更新活动状态
		agent.isActive = isActive;

		// 保存更新后的配置
		await safeRedisOperation(() =>
			redis.set(`${INSTANCE_PREFIX}${instanceId}:agent`, JSON.stringify(agent)),
		);

		console.log(
			`已将实例 ${instanceId} 的全局机器人状态设置为: ${isActive ? "激活" : "禁用"} (实例级别设置)`,
		);
		return true;
	} catch (error) {
		console.error(`设置实例 ${instanceId} 的机器人活动状态失败:`, error);
		return false;
	}
}

/**
 * 删除实例的所有Redis数据
 */
export async function deleteInstanceData(instanceId: string): Promise<boolean> {
	try {
		// 查找所有与实例相关的键
		const instancePattern = `${INSTANCE_PREFIX}${instanceId}:*`;
		const chatPattern = `${CHAT_CONTROL_PREFIX}${instanceId}:*`;

		const instanceKeys = await safeRedisOperation(() =>
			redis.keys(instancePattern),
		);
		const chatKeys = await safeRedisOperation(() => redis.keys(chatPattern));

		const allKeys = [...instanceKeys, ...chatKeys];

		if (allKeys.length > 0) {
			// 批量删除所有键
			await safeRedisOperation(() => redis.del(...allKeys));
			console.log(
				`删除实例 ${instanceId} 的所有Redis数据成功, 共${allKeys.length}条`,
			);
		} else {
			console.log(`实例 ${instanceId} 没有Redis数据需要清理`);
		}

		return true;
	} catch (error) {
		console.error(`删除实例 ${instanceId} 的Redis数据失败:`, error);
		return false;
	}
}

/**
 * 删除特定聊天的控制设置
 */
export async function deleteChatControl(
	instanceId: string,
	chatId: string,
): Promise<boolean> {
	try {
		// 构建聊天控制键
		const key = `${CHAT_CONTROL_PREFIX}${instanceId}:${chatId}:active`;

		// 删除键
		await safeRedisOperation(() => redis.del(key));

		console.log(`已删除聊天 ${chatId} (实例 ${instanceId}) 的特定控制设置`);
		return true;
	} catch (error) {
		console.error(`删除聊天 ${chatId} 的控制设置失败:`, error);
		return false;
	}
}

/**
 * 保存实例的机器人电话号码到Redis
 */
export async function saveBotPhoneNumber(
	instanceId: string,
	phoneNumber: string,
): Promise<boolean> {
	try {
		const key = `${BOT_PHONE_PREFIX}${instanceId}`;

		// 保存电话号码
		await safeRedisOperation(() => redis.set(key, phoneNumber));
		console.log(`已保存实例 ${instanceId} 的机器人电话号码: ${phoneNumber}`);

		return true;
	} catch (error) {
		console.error(`保存实例 ${instanceId} 的机器人电话号码失败:`, error);
		return false;
	}
}

/**
 * 从Redis获取实例的机器人电话号码
 */
export async function getBotPhoneNumber(
	instanceId: string,
): Promise<string | null> {
	try {
		const key = `${BOT_PHONE_PREFIX}${instanceId}`;

		// 获取电话号码
		const phoneNumber = await safeRedisOperation(() => redis.get(key));

		if (!phoneNumber || typeof phoneNumber !== "string") {
			console.log(`实例 ${instanceId} 的机器人电话号码尚未设置`);
			return null;
		}

		return phoneNumber;
	} catch (error) {
		console.error(`获取实例 ${instanceId} 的机器人电话号码失败:`, error);
		return null;
	}
}
