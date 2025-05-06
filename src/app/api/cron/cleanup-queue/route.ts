import { env } from "@/env";
import { performQueueCleanup } from "@/lib/queue/scheduled-cleanup";
import { NextResponse } from "next/server";

/**
 * 队列清理定时任务
 * 通过Vercel Cron执行，默认每4小时执行一次
 */
export async function GET(request: Request) {
	// 验证授权
	const authHeader = request.headers.get("Authorization");
	if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	try {
		// 执行清理任务
		const cleanedCount = await performQueueCleanup();

		// 返回成功响应
		return NextResponse.json({
			success: true,
			timestamp: new Date().toISOString(),
			cleanedJobs: cleanedCount,
		});
	} catch (error) {
		console.error("[Cron] 队列清理失败:", error);

		// 返回错误响应
		return NextResponse.json(
			{
				success: false,
				error: (error as Error).message,
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

// Export a route configuration for cron jobs
export const dynamic = "force-dynamic";
export const revalidate = 0;
