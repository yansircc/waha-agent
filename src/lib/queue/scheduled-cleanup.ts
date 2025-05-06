import { cleanupOldJobs } from "./session-queue";

// 上次运行时间记录
let lastCleanupTime = 0;
// 清理间隔 (ms) - 默认4小时执行一次
const CLEANUP_INTERVAL_MS = 4 * 60 * 60 * 1000;
// 清理保留时间 (hours) - 默认保留12小时内的数据
const RETENTION_HOURS = 12;

/**
 * 执行队列清理操作
 * 只在服务器端执行
 */
export async function performQueueCleanup(): Promise<number> {
	const now = Date.now();

	// 检查是否需要执行清理
	if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
		return 0;
	}

	try {
		// 更新上次运行时间
		lastCleanupTime = now;

		// 执行清理操作
		const cleanedCount = await cleanupOldJobs(RETENTION_HOURS);
		console.log(`[Queue Cleanup] 已清理 ${cleanedCount} 个过时任务`);

		return cleanedCount;
	} catch (error) {
		console.error("[Queue Cleanup] 清理队列失败:", error);
		return 0;
	}
}

/**
 * 启动定期清理任务
 * 只在服务器端执行
 */
export function startPeriodicCleanup(): void {
	// 避免在客户端执行
	if (typeof window !== "undefined") return;

	// 立即执行一次清理
	void performQueueCleanup();

	// 设置定期执行
	const intervalId = setInterval(() => {
		void performQueueCleanup();
	}, CLEANUP_INTERVAL_MS);

	// 确保进程退出时清理定时器
	if (typeof process !== "undefined") {
		process.on("beforeExit", () => {
			clearInterval(intervalId);
		});
	}
}
