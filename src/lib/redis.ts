import { env } from "@/env";
import { Redis } from "ioredis";

// Redis client for caching
export const redis = new Redis(env.REDIS_URL);

// Connect and set up error handling
export async function redisConnect() {
	try {
		await redis.ping();
		console.log("Redis connection successful");
		return redis;
	} catch (error) {
		console.error("Redis connection failed:", error);
		return null;
	}
}
