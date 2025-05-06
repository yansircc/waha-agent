import { queueSessionDelete } from "@/lib/queue/session-queue";
import { getRedisForInstance, safeRedisOperation } from "@/lib/redis";

// Redis键前缀
const QR_SCAN_PREFIX = "qr-scan-count:";
// QR计数的TTL (秒)
const QR_SCAN_TTL = 10 * 60; // 10分钟
// 最大连续扫描次数阈值
const MAX_CONSECUTIVE_QR_SCANS = 5;

/**
 * 记录QR码扫描次数并检查是否需要触发删除操作
 * @param instanceId 实例ID
 * @param sessionName 会话名称
 * @returns 是否已触发删除操作
 */
export async function trackQRScan(
	instanceId: string,
	sessionName: string,
): Promise<{
	scanCount: number;
	deleteTriggered: boolean;
}> {
	const redis = getRedisForInstance();
	const key = `${QR_SCAN_PREFIX}${instanceId}:${sessionName}`;

	return await safeRedisOperation(async () => {
		// 获取当前计数
		const count = await redis.get(key);
		// 增加计数
		const newCount = (Number.parseInt(count as string) || 0) + 1;

		// 设置计数并更新TTL
		await redis.set(key, newCount.toString());
		await redis.expire(key, QR_SCAN_TTL);

		console.log(
			`实例 ${instanceId} 的QR码扫描计数: ${newCount}/${MAX_CONSECUTIVE_QR_SCANS}`,
		);

		// 检查是否达到阈值
		if (newCount >= MAX_CONSECUTIVE_QR_SCANS) {
			console.log(
				`实例 ${instanceId} 连续收到${newCount}次QR码扫描请求，判定为连接失败`,
			);

			// 触发删除操作
			await triggerSessionDelete(instanceId);

			// 重置计数器
			await redis.del(key);

			console.log(
				`实例 ${instanceId} 连续收到 ${newCount} 次QR码扫描请求，已将删除请求添加到队列，计数器已重置`,
			);

			return {
				scanCount: newCount,
				deleteTriggered: true,
			};
		}

		return {
			scanCount: newCount,
			deleteTriggered: false,
		};
	});
}

/**
 * 重置QR码扫描计数
 * 当收到非QR码事件时调用此方法
 */
export async function resetQRScanCount(
	instanceId: string,
	sessionName: string,
): Promise<void> {
	const redis = getRedisForInstance();
	const key = `${QR_SCAN_PREFIX}${instanceId}:${sessionName}`;

	await safeRedisOperation(async () => {
		await redis.del(key);
		console.log(`已重置实例${instanceId}的QR码扫描计数`);
	});
}

/**
 * 触发会话删除操作
 */
async function triggerSessionDelete(instanceId: string): Promise<void> {
	try {
		// 使用统一的删除队列函数
		const job = await queueSessionDelete(instanceId);

		if (job) {
			console.log(
				`已将实例 ${instanceId} 的删除请求添加到队列，任务ID: ${job.id}`,
			);
		} else {
			console.error(`为实例 ${instanceId} 触发删除操作失败`);
		}
	} catch (error) {
		console.error("触发会话删除出错:", error);
	}
}
