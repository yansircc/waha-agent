"use client";

import type { JobStatus } from "@/lib/jina/types";
import type { bulkCrawl } from "@/trigger/bulk-crawl";
import { useRealtimeRun, useTaskTrigger } from "@trigger.dev/react-hooks";
import type { RealtimeRun } from "@trigger.dev/sdk";
import { useEffect, useState } from "react";

interface BulkCrawlFormProps {
	publicAccessToken: string;
	userId: string;
}

export function BulkCrawlForm({
	publicAccessToken,
	userId,
}: BulkCrawlFormProps) {
	const [urls, setUrls] = useState<string>("");
	const [kbId, setKbId] = useState<string>("default");
	const [runId, setRunId] = useState<string | null>(null);

	const {
		submit,
		handle,
		isLoading,
		error: submitError,
	} = useTaskTrigger<typeof bulkCrawl>("bulk-crawl", {
		accessToken: publicAccessToken,
	});

	// 当处理完成后更新 UI
	useEffect(() => {
		if (handle?.id) {
			setRunId(handle.id);
			setUrls("");
		}
	}, [handle]);

	// 使用 useRealtimeRun 获取任务状态
	const { run, error: runError } = useRealtimeRun<typeof bulkCrawl>(
		runId || "",
		{
			accessToken: publicAccessToken,
			enabled: !!runId, // 仅当有 runId 时启用
		},
	);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		if (!urls.trim()) return;

		try {
			// 将输入的 URL 拆分为数组并验证
			const urlList = urls
				.split("\n")
				.map((url) => url.trim())
				.filter((url) => url && isValidUrl(url));

			if (urlList.length === 0) {
				throw new Error("请输入至少一个有效的 URL");
			}

			// 触发批量爬取任务
			submit(
				{
					urls: urlList,
					userId: userId,
					kbId: kbId.trim() || "default",
				},
				{
					tags: [`user-${userId}`],
				},
			);
		} catch (err) {
			console.error("提交爬取任务失败:", err);
			alert(err instanceof Error ? err.message : "提交爬取任务失败");
		}
	}

	// 验证 URL 格式
	function isValidUrl(urlString: string): boolean {
		try {
			const url = new URL(urlString);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}

	return (
		<div className="w-full">
			<h2 className="mb-3 font-semibold text-lg">批量爬取 URL</h2>

			{submitError && (
				<div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700 text-sm">
					错误: {submitError.message}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label
						htmlFor="kbId"
						className="mb-1 block font-medium text-gray-700 text-sm"
					>
						知识库 ID（可选）
					</label>
					<input
						id="kbId"
						value={kbId}
						onChange={(e) => setKbId(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
						placeholder="输入知识库ID（默认为default）"
					/>
				</div>

				<div>
					<label
						htmlFor="urls"
						className="mb-1 block font-medium text-gray-700 text-sm"
					>
						输入 URL（每行一个）
					</label>
					<textarea
						id="urls"
						value={urls}
						onChange={(e) => setUrls(e.target.value)}
						rows={5}
						className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
						placeholder="https://example.com/page1"
					/>
				</div>

				<div>
					<button
						type="submit"
						disabled={isLoading || !urls.trim()}
						className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 font-medium text-sm text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
					>
						{isLoading ? "提交中..." : "开始爬取"}
					</button>
				</div>
			</form>

			{/* 任务结果区域 */}
			{runId && (
				<div className="mt-6 border-gray-200 border-t pt-6">
					<h3 className="mb-4 font-semibold text-lg">任务结果</h3>

					{runError ? (
						<div className="rounded-lg bg-red-50 p-4 text-red-700">
							<p className="text-sm">获取任务状态失败: {runError.message}</p>
						</div>
					) : !run ? (
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
							<p className="text-gray-500">正在加载任务状态...</p>
						</div>
					) : (
						<RunResultCard run={run} />
					)}
				</div>
			)}
		</div>
	);
}

// 任务结果卡片组件
function RunResultCard({ run }: { run: RealtimeRun<typeof bulkCrawl> }) {
	// 计算持续时间
	const startTime = run.startedAt ? new Date(run.startedAt) : null;
	const endTime = run.finishedAt ? new Date(run.finishedAt) : new Date();
	const duration = run.durationMs
		? Math.floor(run.durationMs / 1000)
		: startTime
			? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
			: 0;

	// 映射状态到 JobStatus
	let status: JobStatus = "pending";
	if (run.status === "COMPLETED") status = "completed";
	else if (run.status === "FAILED") status = "failed";
	else if (run.status === "EXECUTING") status = "processing";

	return (
		<div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
			<div className="border-gray-100 border-b bg-gray-50 px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<span className="font-medium">任务 ID:</span>
						<code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm">
							{run.id.substring(0, 12)}
						</code>
					</div>
					<StatusBadge status={status} />
				</div>
			</div>

			<div className="p-4">
				<div className="mb-3 grid grid-cols-2 gap-4 text-sm">
					<div>
						<span className="text-gray-500">开始时间: </span>
						<span className="font-medium">
							{startTime?.toLocaleString() || "未开始"}
						</span>
					</div>
					<div>
						<span className="text-gray-500">持续时间: </span>
						<span className="font-medium">{formatDuration(duration)}</span>
					</div>

					{run.output && (
						<>
							<div className="col-span-2">
								<span className="text-gray-500">总计 URL: </span>
								<span className="font-medium">{run.output.totalCount}</span>
								<span className="ml-2 text-gray-500">成功爬取: </span>
								<span className="font-medium">{run.output.completedCount}</span>
							</div>

							{run.output.fileUrl && (
								<div className="col-span-2 mt-2">
									<span className="text-gray-500">文件: </span>
									<a
										href={run.output.fileUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="break-all font-medium text-blue-600 hover:underline"
									>
										{run.output.filePath}
									</a>
								</div>
							)}
						</>
					)}
				</div>

				{run.error && (
					<div className="mt-3 border-gray-100 border-t pt-3 text-red-600">
						<div className="mb-1 font-medium">错误信息:</div>
						<div className="rounded border border-red-100 bg-red-50 p-2 text-sm">
							{run.error.message}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// 格式化持续时间
function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds}秒`;

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	if (minutes < 60) {
		return `${minutes}分 ${remainingSeconds}秒`;
	}

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;

	return `${hours}小时 ${remainingMinutes}分 ${remainingSeconds}秒`;
}

// 状态标签组件
function StatusBadge({ status }: { status: JobStatus }) {
	const colors = {
		pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
		processing: "bg-blue-100 text-blue-800 border-blue-200",
		completed: "bg-green-100 text-green-800 border-green-200",
		failed: "bg-red-100 text-red-800 border-red-200",
	};

	const labels = {
		pending: "等待中",
		processing: "处理中",
		completed: "已完成",
		failed: "失败",
	};

	return (
		<span
			className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium text-xs ${colors[status]}`}
		>
			{labels[status]}
		</span>
	);
}
