"use client";

import type { bulkCrawl } from "@/trigger/bulk-crawl";
import { api } from "@/utils/api";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useState } from "react";
import { toast } from "sonner";

/**
 * src/trigger/bulk-crawl.ts
 */
export default function DemoPage() {
	const [urls, setUrls] = useState("");
	const [runId, setRunId] = useState<string | null>(null);
	const [token, setToken] = useState<string | null>(null);

	// tRPC mutation
	const crawlMutation = api.demo.triggerBulkCrawl.useMutation({
		onSuccess: (data) => {
			setRunId(data.handle.id);
			setToken(data.token);
			setUrls("");
		},

		onError: (error) => {
			toast.error(error.message);
		},
	});

	// 任务状态监控
	const { run } = useRealtimeRun<typeof bulkCrawl>(runId || "", {
		accessToken: token || "",
		enabled: !!runId && !!token,
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const urlList = urls
			.split("\n")
			.map((url) => url.trim())
			.filter((url) => {
				try {
					return new URL(url).protocol.startsWith("http");
				} catch {
					return false;
				}
			});

		if (urlList.length === 0) return;

		crawlMutation.mutate({
			urls: urlList,
			userId: "admin",
			kbId: "default",
		});
	}

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="mb-4 font-bold text-2xl">Demo: Sitemap Crawler</h1>

			<form onSubmit={handleSubmit} className="mb-6">
				<div className="mb-4">
					<label htmlFor="urls-input" className="mb-2 block font-medium">
						URLs (one per line)
					</label>
					<textarea
						id="urls-input"
						value={urls}
						onChange={(e) => setUrls(e.target.value)}
						className="h-32 w-full rounded border p-2"
						placeholder="https://example.com"
					/>
				</div>

				<button
					type="submit"
					disabled={crawlMutation.isPending || !urls.trim()}
					className="rounded bg-blue-500 px-4 py-2 text-white disabled:bg-gray-300"
				>
					{crawlMutation.isPending ? "Processing..." : "Start Crawling"}
				</button>
			</form>

			{run && (
				<div className="rounded-md border p-4">
					<div className="mb-2 flex justify-between">
						<span className="font-medium">
							Task ID: {run.id.substring(0, 8)}
						</span>
						<span
							className={`rounded px-2 py-1 text-xs ${getStatusColor(run.status)}`}
						>
							{run.status}
						</span>
					</div>

					{run.output && (
						<div className="mt-2 text-sm">
							<p>
								URLs: {run.output.totalCount} | Completed:{" "}
								{run.output.completedCount}
							</p>
							{run.output.fileUrl && (
								<a
									href={run.output.fileUrl}
									className="text-blue-500 underline"
									target="_blank"
									rel="noreferrer"
								>
									View file
								</a>
							)}
						</div>
					)}

					{run.error && (
						<div className="mt-2 text-red-500 text-sm">
							Error: {run.error.message}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function getStatusColor(status: string) {
	switch (status) {
		case "COMPLETED":
			return "bg-green-100 text-green-800";
		case "FAILED":
			return "bg-red-100 text-red-800";
		case "EXECUTING":
			return "bg-blue-100 text-blue-800";
		default:
			return "bg-gray-100 text-gray-800";
	}
}
