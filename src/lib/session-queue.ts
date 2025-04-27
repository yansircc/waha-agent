import { getRedisForInstance, safeRedisOperation } from "@/lib/redis";
import { wahaApi } from "@/server/api/routers/waha-api";

interface QueueItem {
	session: string;
	instanceId?: string;
}

// Maximum number of concurrent session starts
const MAX_CONCURRENT_STARTS = 3;

// Key names for Redis
const QUEUE_KEY = "waha:session:queue";
const PROCESSING_KEY = "waha:session:processing";
const LAST_CHECK_KEY = "waha:session:lastCheck";

/**
 * Add a session to the start queue
 */
export async function queueSessionStart(
	session: string,
	instanceId?: string,
): Promise<{ position: number }> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
		// Add session to queue
		const item: QueueItem = { session, instanceId };
		await redis.rpush(QUEUE_KEY, JSON.stringify(item));

		// Get position in queue
		const queueLength = await redis.llen(QUEUE_KEY);

		// Trigger queue processing
		void processQueue();

		return { position: queueLength };
	});
}

/**
 * Process the session start queue
 */
export async function processQueue(): Promise<void> {
	const redis = getRedisForInstance();

	// Use a lock to prevent multiple concurrent processing attempts
	const now = Date.now();
	const lastCheck = (await redis.get(LAST_CHECK_KEY)) as string | null;

	// Prevent processing more than once every 2 seconds
	if (lastCheck && now - Number.parseInt(lastCheck, 10) < 2000) {
		return;
	}

	await redis.set(LAST_CHECK_KEY, now.toString());

	try {
		// Get current count of processing sessions
		const processing = (await redis.hgetall(PROCESSING_KEY)) || {};
		const processingCount = Object.keys(processing).length;

		// Check if we can start more sessions
		if (processingCount >= MAX_CONCURRENT_STARTS) {
			return;
		}

		// Calculate how many more sessions we can start
		const available = MAX_CONCURRENT_STARTS - processingCount;

		// Start sessions up to the maximum
		for (let i = 0; i < available; i++) {
			const item = await redis.lpop(QUEUE_KEY);
			if (!item) {
				break; // Queue is empty
			}

			const { session, instanceId } = JSON.parse(item as string) as QueueItem;

			// Add to processing set using hash
			await redis.hset(PROCESSING_KEY, { [session]: Date.now().toString() });

			// Start session in the background
			void startSessionAsync(session, instanceId);
		}
	} catch (error) {
		console.error("Error processing session queue:", error);
	}
}

/**
 * Start a session asynchronously and remove from processing when done
 */
async function startSessionAsync(
	session: string,
	instanceId?: string,
): Promise<void> {
	const redis = getRedisForInstance();

	try {
		// Start the session
		await wahaApi.sessions.startSession(session);
		console.log(`Session ${session} started successfully`);
	} catch (error) {
		console.error(`Failed to start session ${session}:`, error);
	} finally {
		// Remove from processing set regardless of success/failure
		await redis.hdel(PROCESSING_KEY, session);

		// Trigger processing the next item in queue
		setTimeout(() => void processQueue(), 1000);
	}
}

/**
 * Get the current queue status
 */
export async function getQueueStatus(): Promise<{
	waiting: number;
	processing: number;
}> {
	const redis = getRedisForInstance();

	return await safeRedisOperation(async () => {
		// Get queue length and processing info
		const queueLength = await redis.llen(QUEUE_KEY);

		// Handle potential null response from hgetall
		let processing: Record<string, unknown> = {};
		try {
			const result = await redis.hgetall(PROCESSING_KEY);
			if (result) {
				processing = result;
			}
		} catch (error) {
			console.error("Error getting processing sessions:", error);
		}

		return {
			waiting: queueLength,
			processing: Object.keys(processing).length,
		};
	});
}

/**
 * Clear the queue and processing sessions (for admin use)
 */
export async function clearQueue(): Promise<void> {
	const redis = getRedisForInstance();

	await safeRedisOperation(async () => {
		await redis.del(QUEUE_KEY);
		await redis.del(PROCESSING_KEY);
	});
}
