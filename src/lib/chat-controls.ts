import { CHAT_CONTROL_PREFIX } from "./instance-redis";
import { redis, safeRedisOperation } from "./redis";

/**
 * 获取指定实例的所有聊天控制状态
 */
export async function listChatControls(instanceId: string) {
	try {
		// 构建键模式
		const pattern = `${CHAT_CONTROL_PREFIX}${instanceId}:*:active`;

		// 获取所有匹配的键
		const keys = await safeRedisOperation(() => redis.keys(pattern));

		if (keys.length === 0) {
			return {
				success: true,
				message: `实例 ${instanceId} 没有设置任何聊天级别的控制`,
				chats: [],
			};
		}

		// 批量获取所有值
		const values = await safeRedisOperation(() => redis.mget(...keys));

		// 解析结果
		const chats = keys.map((key, index) => {
			// 从键中提取聊天ID：chat-control:instanceId:chatId:active
			const parts = key.split(":");
			const chatId = parts[2];

			return {
				chatId,
				isActive: values[index] === "1",
			};
		});

		return {
			success: true,
			message: `找到 ${chats.length} 个聊天控制设置`,
			chats,
		};
	} catch (error) {
		console.error(`获取实例 ${instanceId} 的聊天控制状态失败:`, error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			chats: [],
		};
	}
}

/**
 * 使用"*"模式匹配，批量设置满足条件的聊天控制状态
 * 例如：updateChatControlsByPattern("instance123", "123*", true)
 * 会将所有以123开头的聊天ID设置为激活状态
 */
export async function updateChatControlsByPattern(
	instanceId: string,
	chatPattern: string,
	isActive: boolean,
) {
	try {
		// 先获取所有相关的键
		const fullPattern = `${CHAT_CONTROL_PREFIX}${instanceId}:*:active`;
		const allKeys = await safeRedisOperation(() => redis.keys(fullPattern));

		// 如果没有键，不需要更新
		if (allKeys.length === 0) {
			return {
				success: true,
				message: `实例 ${instanceId} 没有聊天控制设置需要更新`,
				matchedCount: 0,
			};
		}

		// 根据模式过滤键
		const matchedKeys = allKeys.filter((key) => {
			const parts = key.split(":");
			// 确保chatId不为undefined
			if (parts.length < 3) return false;

			const chatId = parts[2];

			// 将通配符模式转换为正则表达式
			const regexPattern = chatPattern.replace(/\*/g, ".*");
			const regex = new RegExp(`^${regexPattern}$`);

			return regex.test(chatId || "");
		});

		if (matchedKeys.length === 0) {
			return {
				success: true,
				message: `没有聊天匹配模式 "${chatPattern}"`,
				matchedCount: 0,
			};
		}

		// 批量更新匹配的键
		const value = isActive ? "1" : "0";
		const updatePromises = matchedKeys.map((key) =>
			safeRedisOperation(() => redis.set(key, value)),
		);

		await Promise.all(updatePromises);

		return {
			success: true,
			message: `已更新 ${matchedKeys.length} 个聊天的控制状态为 ${isActive ? "激活" : "禁用"}`,
			matchedCount: matchedKeys.length,
		};
	} catch (error) {
		console.error("批量更新聊天控制状态失败:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			matchedCount: 0,
		};
	}
}

/**
 * 批量删除满足模式的聊天控制设置
 */
export async function deleteChatControlsByPattern(
	instanceId: string,
	chatPattern: string,
) {
	try {
		// 先获取所有相关的键
		const fullPattern = `${CHAT_CONTROL_PREFIX}${instanceId}:*:active`;
		const allKeys = await safeRedisOperation(() => redis.keys(fullPattern));

		// 如果没有键，不需要删除
		if (allKeys.length === 0) {
			return {
				success: true,
				message: `实例 ${instanceId} 没有聊天控制设置需要删除`,
				deletedCount: 0,
			};
		}

		// 根据模式过滤键
		const matchedKeys = allKeys.filter((key) => {
			const parts = key.split(":");
			const chatId = parts[2] || ""; // 确保chatId不为undefined

			// 将通配符模式转换为正则表达式
			const regexPattern = chatPattern.replace(/\*/g, ".*");
			const regex = new RegExp(`^${regexPattern}$`);

			return regex.test(chatId);
		});

		if (matchedKeys.length === 0) {
			return {
				success: true,
				message: `没有聊天匹配模式 "${chatPattern}"`,
				deletedCount: 0,
			};
		}

		// 批量删除匹配的键
		if (matchedKeys.length > 0) {
			await safeRedisOperation(() => redis.del(...matchedKeys));
		}

		return {
			success: true,
			message: `已删除 ${matchedKeys.length} 个聊天的控制设置`,
			deletedCount: matchedKeys.length,
		};
	} catch (error) {
		console.error("批量删除聊天控制设置失败:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			deletedCount: 0,
		};
	}
}
