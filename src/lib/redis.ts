import { env } from "@/env";
import { Redis } from "ioredis";

// Redis client for caching and PubSub
export const redis = new Redis(env.REDIS_URL);

// Connect and set up error handling
const redisConnect = async () => {
	try {
		await redis.ping();
		console.log("Redis connection successful");
		return redis;
	} catch (error) {
		console.error("Redis connection failed:", error);
		return null;
	}
};

// PubSub channels
export const REDIS_CHANNELS = {
	DOCUMENT_UPDATED: "document:updated",
};

// Document update notification
export async function publishDocumentUpdate(documentId: string, kbId: string) {
	try {
		await redis.publish(
			REDIS_CHANNELS.DOCUMENT_UPDATED,
			JSON.stringify({
				documentId,
				kbId,
				timestamp: Date.now(),
			}),
		);
		return true;
	} catch (error) {
		console.error("Failed to publish document update:", error);
		return false;
	}
}

export { redisConnect };
