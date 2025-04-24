import { env } from "@/env";
import { Redis } from "@upstash/redis";

// Redis singleton client
let redisClient: Redis | null = null;

// Get Redis client function
export function getRedis(): Redis {
	if (!redisClient) {
		try {
			// Try to create from standard environment variables first
			redisClient = Redis.fromEnv();
			console.log("[Redis] Client initialized from environment variables");
		} catch (error) {
			// Fallback to custom environment variables
			console.log("[Redis] Falling back to custom environment variables");

			// Extract URL components - expecting redis://user:pass@hostname:port format
			const url = env.UPSTASH_REDIS_REST_URL;
			const token = env.UPSTASH_REDIS_REST_TOKEN;

			redisClient = new Redis({
				url: url,
				token: token,
			});
			console.log("[Redis] Client initialized with custom configuration");
		}

		// Handle process exit
		process.on("exit", () => {
			console.log("[Redis] Process exiting, client cleanup");
			redisClient = null;
		});
	}

	return redisClient;
}

// Export redis instance
export const redis = getRedis();

// Check Redis connection status
export async function redisConnect(): Promise<Redis | null> {
	try {
		// Simple health check
		await redis.ping();
		console.log("[Redis] Connection successful");
		return redis;
	} catch (error) {
		console.error("[Redis] Connection failed:", error);
		return null;
	}
}

// Safe Redis operation with retry logic
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
				`[Redis] Operation failed (attempt ${retries}/${maxRetries}):`,
				lastError.message,
			);

			if (retries >= maxRetries) {
				break;
			}

			// Exponential backoff retry
			const delay = Math.min(2 ** retries * 100, 2000);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError || new Error("Maximum retries reached");
}

// Specialized helper for handling Redis set operations that accept strings only
export function stringifyValueIfNeeded(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}
	if (value === null || value === undefined) {
		return "";
	}
	return JSON.stringify(value);
}

// Helper to safely parse JSON values
export function parseJsonValueIfNeeded(value: unknown): unknown {
	// 如果值为null或undefined，直接返回null
	if (value === null || value === undefined) return null;

	// 如果已经是对象类型（非字符串），直接返回
	if (typeof value !== "string") return value;

	// 否则尝试解析JSON字符串
	try {
		return JSON.parse(value);
	} catch (e) {
		// 如果解析失败，返回原始值
		return value;
	}
}
