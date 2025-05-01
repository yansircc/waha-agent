// src/app/kb/components/crawl-webpage-dialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { bulkCrawl } from "@/trigger/bulk-crawl";
import { useTaskTrigger } from "@trigger.dev/react-hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CrawlWebpageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	publicAccessToken: string;
	userId: string;
	kbId: string;
	onCrawlSubmitted: (runId: string) => void;
}

export function CrawlWebpageDialog({
	open,
	onOpenChange,
	publicAccessToken,
	userId,
	kbId,
	onCrawlSubmitted,
}: CrawlWebpageDialogProps) {
	const [urls, setUrls] = useState<string>("");
	const [submitted, setSubmitted] = useState<boolean>(false);

	const {
		submit,
		handle,
		isLoading,
		error: submitError,
	} = useTaskTrigger<typeof bulkCrawl>("bulk-crawl", {
		accessToken: publicAccessToken,
	});

	// 使用useEffect监听handle变化，避免在渲染期间更新状态
	useEffect(() => {
		if (handle?.id && open) {
			setSubmitted(true);
			onCrawlSubmitted(handle.id);
			onOpenChange(false);

			setTimeout(() => {
				setUrls("");
				setSubmitted(false);
			}, 500);
		}
	}, [handle?.id, open, onCrawlSubmitted, onOpenChange]);

	// 当对话框关闭时重置状态
	useEffect(() => {
		if (!open) {
			setTimeout(() => {
				if (!open) {
					setSubmitted(false);
				}
			}, 300);
		}
	}, [open]);

	// 检查URL是否有效
	function isValidUrl(urlString: string): boolean {
		try {
			const url = new URL(urlString);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}

	// 处理表单提交
	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		if (!urls.trim()) {
			toast.error("输入错误", {
				description: "请输入至少一个URL",
			});
			return;
		}

		// 已提交状态下不重复处理
		if (submitted) {
			return;
		}

		try {
			// 分割URL并验证
			const urlList = urls
				.split("\n")
				.map((url) => url.trim())
				.filter((url) => url && isValidUrl(url));

			if (urlList.length === 0) {
				toast.error("无效的URL", {
					description: "请确保输入的URL格式正确",
				});
				return;
			}

			setSubmitted(true);

			// 提交批量爬取任务
			submit(
				{
					urls: urlList,
					userId,
					kbId,
				},
				{
					tags: [`user-${userId}`, `kb-${kbId}`],
				},
			);

			// 如果没有立即获得handle ID，主动关闭对话框
			if (!handle?.id) {
				toast.success("爬取任务已提交", {
					description: "正在后台处理...",
				});

				// 短暂延迟后关闭，给用户一点视觉反馈时间
				setTimeout(() => {
					onOpenChange(false);
					setUrls("");
				}, 1000);
			}
		} catch (err) {
			console.error("提交爬取任务失败:", err);
			toast.error("提交失败", {
				description: err instanceof Error ? err.message : "提交爬取任务失败",
			});
			setSubmitted(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[525px]">
				<DialogHeader>
					<DialogTitle>爬取网页到知识库</DialogTitle>
					<DialogDescription>
						输入您想爬取内容的URL，每行一个。系统将自动提取内容并添加到知识库。
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="urls">输入URL（每行一个）</Label>
							<Textarea
								id="urls"
								value={urls}
								onChange={(e) => setUrls(e.target.value)}
								placeholder="https://example.com/page1&#10;https://example.com/page2"
								rows={5}
								className="resize-none"
							/>
						</div>
					</div>

					{submitError && (
						<div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700 text-sm">
							错误: {submitError.message}
						</div>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							取消
						</Button>
						<Button type="submit" disabled={isLoading || !urls.trim()}>
							{isLoading ? "提交中..." : "开始爬取"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
