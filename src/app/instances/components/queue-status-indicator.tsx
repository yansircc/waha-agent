"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/utils/api";
import { Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface QueueStats {
	waitingCount: number;
	activeCount: number;
	totalJobs: number;
	queuePositions: Record<string, number>;
}

interface QueueStatusIndicatorProps {
	instanceId: string;
	jobId?: string;
}

export function QueueStatusIndicator({
	instanceId,
	jobId,
}: QueueStatusIndicatorProps) {
	const [isVisible, setIsVisible] = useState(false);
	const [stats, setStats] = useState<{
		position?: number;
		isActive: boolean;
		waitingCount: number;
		estimatedTime?: number;
	} | null>(null);

	// 检查实例是否有活跃任务
	const activeJobQuery = api.sessionQueue.checkActiveJob.useQuery(
		{ instanceId },
		{
			refetchInterval: 5000, // 每5秒检查一次
			enabled: !!instanceId,
		},
	);

	// 获取队列统计信息
	const statsQuery = api.sessionQueue.getStats.useQuery(undefined, {
		refetchInterval: 5000,
		enabled: !!instanceId,
	});

	useEffect(() => {
		if (statsQuery.data && activeJobQuery.data) {
			const queueData = statsQuery.data as QueueStats;
			const { hasActiveJob, job } = activeJobQuery.data;

			if (hasActiveJob || job) {
				// 获取任务ID
				const currentJobId = job?.id || jobId;

				if (currentJobId) {
					// 计算队列位置
					const position = queueData.queuePositions[currentJobId];

					// 更新状态
					setStats({
						position,
						isActive: hasActiveJob,
						waitingCount: queueData.waitingCount,
						estimatedTime: position !== undefined ? position * 5 : undefined, // 每个任务估计5秒
					});

					// 如果有队列位置或者任务处于活跃状态，则显示指示器
					setIsVisible(position !== undefined || hasActiveJob);
				}
			} else {
				setIsVisible(false);
			}
		}
	}, [statsQuery.data, activeJobQuery.data, jobId]);

	if (!isVisible || !stats) return null;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-amber-800 text-sm">
						{stats.isActive ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Clock className="h-3.5 w-3.5" />
						)}
						<span>
							{stats.isActive
								? "处理中..."
								: `队列位置: ${stats.position !== undefined ? stats.position + 1 : "未知"}`}
						</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<div className="space-y-1 p-1">
						<p className="font-medium text-xs">WhatsApp 会话队列状态</p>
						<div className="grid grid-cols-2 gap-x-4 gap-y-1">
							<p className="text-muted-foreground text-xs">状态:</p>
							<p className="text-xs">{stats.isActive ? "处理中" : "等待中"}</p>

							{stats.position !== undefined && !stats.isActive && (
								<>
									<p className="text-muted-foreground text-xs">队列位置:</p>
									<p className="text-xs">{stats.position + 1}</p>
								</>
							)}

							<p className="text-muted-foreground text-xs">等待人数:</p>
							<p className="text-xs">{stats.waitingCount}</p>

							{stats.estimatedTime !== undefined && !stats.isActive && (
								<>
									<p className="text-muted-foreground text-xs">预计等待:</p>
									<p className="text-xs">
										{Math.ceil(stats.estimatedTime / 60)} 分钟
									</p>
								</>
							)}
						</div>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
