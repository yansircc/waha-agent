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
import { env } from "@/env";
import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CrawlWebpageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId: string;
	kbId: string;
	onCrawlSubmitted: (runId: string, token: string) => void;
}

export function CrawlWebpageDialog({
	open,
	onOpenChange,
	userId,
	kbId,
	onCrawlSubmitted,
}: CrawlWebpageDialogProps) {
	const [urls, setUrls] = useState<string>("");
	const [submitted, setSubmitted] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	// tRPC mutation for bulk crawl
	const triggerBulkCrawl = api.crawl.triggerBulkCrawl.useMutation({
		onSuccess: (data) => {
			toast.success("爬取任务已提交", {
				description: "正在后台处理...",
			});

			// 通知父组件并关闭对话框
			onCrawlSubmitted(data.handle?.id || "", data.token);
			onOpenChange(false);

			// 重置表单
			setTimeout(() => {
				setUrls("");
				setSubmitted(false);
				setIsLoading(false);
			}, 500);
		},
		onError: (error) => {
			console.error("提交爬取任务失败:", error);
			toast.error("提交失败", {
				description: error.message || "提交爬取任务失败",
			});
			setSubmitted(false);
			setIsLoading(false);
		},
	});

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
		if (submitted || isLoading || triggerBulkCrawl.isPending) {
			return;
		}

		try {
			// 分割URL并验证
			const urlList = urls
				.split("\n")
				.map((url) => url.trim())
				.filter((url) => url && isValidUrl(url));

			if (urlList.length === 0) {
				toast.error("输入错误", {
					description: "请确保输入的URL格式正确",
				});
				return;
			}

			setSubmitted(true);
			setIsLoading(true);

			// 使用tRPC提交批量爬取任务
			triggerBulkCrawl.mutate({
				urls: urlList,
				userId,
				kbId,
			});
		} catch (err) {
			console.error("提交爬取任务失败:", err);
			toast.error("提交失败", {
				description: err instanceof Error ? err.message : "提交爬取任务失败",
			});
			setSubmitted(false);
			setIsLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[525px]">
				<DialogHeader>
					<DialogTitle>爬取网页到知识库</DialogTitle>
					<DialogDescription>
						输入你想要爬取的网页URL，每行一个。系统将自动提取内容并添加到知识库。
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
								placeholder="https://example.com/page1"
								rows={5}
								className="resize-none"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							取消
						</Button>
						<Button
							type="submit"
							disabled={isLoading || triggerBulkCrawl.isPending || !urls.trim()}
						>
							{isLoading || triggerBulkCrawl.isPending
								? "提交中..."
								: "开始爬取"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
