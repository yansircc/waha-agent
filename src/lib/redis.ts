import { env } from "@/env";
import { Redis } from "@upstash/redis";

/**
 * Redis连接管理器 - 使用连接池支持多租户和多实例
 */
class RedisConnectionManager {
	// 单例实例
	private static instance: RedisConnectionManager;

	// 主连接池 - 用于常规操作
	private defaultClient: Redis | null = null;

	// 租户/实例特定连接池
	private instanceClients: Map<string, Redis> = new Map();

	// 最大连接数
	private maxConnections = 20; // 可根据需要调整

	// 连接活跃度追踪
	private clientLastUsed: Map<string, number> = new Map();

	// 上次健康检查和清理时间
	private lastHealthCheck = 0;
	private healthCheckInterval = 30000; // 30秒
	private cleanupInterval = 300000; // 5分钟内未使用的连接将被清理

	private constructor() {
		// 不再使用process.on("beforeExit")事件
	}

	/**
	 * 获取连接管理器单例
	 */
	public static getInstance(): RedisConnectionManager {
		if (!RedisConnectionManager.instance) {
			RedisConnectionManager.instance = new RedisConnectionManager();
		}
		return RedisConnectionManager.instance;
	}

	/**
	 * 创建新的Redis客户端
	 */
	private createClient(): Redis {
		try {
			// 尝试从环境变量创建
			return Redis.fromEnv();
		} catch (_error) {
			// 回退到自定义配置
			return new Redis({
				url: env.UPSTASH_REDIS_REST_URL,
				token: env.UPSTASH_REDIS_REST_TOKEN,
			});
		}
	}

	/**
	 * 获取默认Redis客户端
	 */
	public getDefaultClient(): Redis {
		if (!this.defaultClient) {
			this.defaultClient = this.createClient();
		}

		// 更新默认客户端的最后使用时间
		this.markClientAsUsed("default");

		// 定期健康检查与清理
		this.scheduleMaintenanceTasks();

		return this.defaultClient;
	}

	/**
	 * 获取实例特定的Redis客户端
	 * @param instanceId 实例ID
	 */
	public getClientForInstance(instanceId: string): Redis {
		// 检查是否已有此实例的连接
		if (!this.instanceClients.has(instanceId)) {
			// 限制连接池大小
			if (this.instanceClients.size >= this.maxConnections) {
				// 如果达到最大连接数，尝试清理不活跃连接
				this.cleanupInactiveConnections();

				// 如果仍然达到限制，复用默认客户端
				if (this.instanceClients.size >= this.maxConnections) {
					// 更新默认客户端使用时间
					this.markClientAsUsed("default");
					return this.getDefaultClient();
				}
			}

			// 创建新连接并缓存
			const client = this.createClient();
			this.instanceClients.set(instanceId, client);
		}

		// 更新客户端最后使用时间
		this.markClientAsUsed(instanceId);

		// 定期健康检查与清理
		this.scheduleMaintenanceTasks();

		// 安全获取连接，使用默认客户端作为备选
		const client = this.instanceClients.get(instanceId);
		if (!client) {
			console.log(`[Redis] 无法获取实例 ${instanceId} 的连接，使用默认连接`);
			return this.getDefaultClient();
		}

		return client;
	}

	/**
	 * 标记客户端被使用
	 */
	private markClientAsUsed(clientId: string) {
		this.clientLastUsed.set(clientId, Date.now());
	}

	/**
	 * 清理不活跃的连接
	 */
	private cleanupInactiveConnections() {
		const now = Date.now();
		let cleanedCount = 0;

		// 检查并清理不活跃的实例连接
		for (const [instanceId, _] of this.instanceClients.entries()) {
			const lastUsed = this.clientLastUsed.get(instanceId) || 0;
			if (now - lastUsed > this.cleanupInterval) {
				this.instanceClients.delete(instanceId);
				this.clientLastUsed.delete(instanceId);
				cleanedCount++;

				console.log(`[Redis] 清理了长时间未使用的实例连接: ${instanceId}`);
			}
		}

		if (cleanedCount > 0) {
			console.log(`[Redis] 已清理 ${cleanedCount} 个不活跃的连接`);
		}
	}

	/**
	 * 调度维护任务 (健康检查与连接清理)
	 */
	private scheduleMaintenanceTasks() {
		const now = Date.now();
		if (now - this.lastHealthCheck > this.healthCheckInterval) {
			this.lastHealthCheck = now;
			// 异步执行健康检查和清理
			setTimeout(() => {
				this.checkHealth();
				this.cleanupInactiveConnections();
			}, 0);
		}
	}

	/**
	 * 执行健康检查
	 */
	private async checkHealth() {
		try {
			if (this.defaultClient) {
				await this.defaultClient.ping();
			}

			// 检查实例客户端
			for (const [instanceId, client] of this.instanceClients.entries()) {
				try {
					await client.ping();
				} catch (_error) {
					console.log(`[Redis] 实例${instanceId}连接故障，正在重置连接`);
					this.instanceClients.delete(instanceId);
				}
			}
		} catch (error) {
			console.error("[Redis] 健康检查失败:", error);
			// 重置默认连接以便下次重新创建
			this.defaultClient = null;
		}
	}
}

// 导出获取Redis连接的便捷函数
export function getRedisForInstance(instanceId?: string): Redis {
	const manager = RedisConnectionManager.getInstance();
	return instanceId
		? manager.getClientForInstance(instanceId)
		: manager.getDefaultClient();
}

// 为兼容现有代码，保留redis导出
export const redis = RedisConnectionManager.getInstance().getDefaultClient();

/**
 * 安全的Redis操作，带重试逻辑
 */
export async function safeRedisOperation<T>(
	operation: () => Promise<T>,
	maxRetries = 3,
): Promise<T> {
	let retries = 0;
	let lastError: Error | null = null;

	while (retries < maxRetries) {
		try {
			return await operation();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			retries++;

			console.error(
				`[Redis] 操作失败 (尝试 ${retries}/${maxRetries}):`,
				lastError.message,
			);

			if (retries >= maxRetries) {
				break;
			}

			// 指数退避重试
			const delay = Math.min(2 ** retries * 100, 2000);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError || new Error("达到最大重试次数");
}

// 处理Redis set操作只接受字符串的辅助函数
export function stringifyValueIfNeeded(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}
	if (value === null || value === undefined) {
		return "";
	}
	return JSON.stringify(value);
}

// 安全解析JSON值的辅助函数
export function parseJsonValueIfNeeded(value: unknown): unknown {
	// 如果值为null或undefined，直接返回null
	if (value === null || value === undefined) return null;

	// 如果已经是对象类型（非字符串），直接返回
	if (typeof value !== "string") return value;

	// 否则尝试解析JSON字符串
	try {
		return JSON.parse(value);
	} catch (_e) {
		// 如果解析失败，返回原始值
		return value;
	}
}
