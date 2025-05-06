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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/utils/api";
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
	const [sitemapUrl, setSitemapUrl] = useState<string>("");
	const [activeTab, setActiveTab] = useState<string>("urls");
	const [submitted, setSubmitted] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	// tRPC mutations
	const triggerBulkCrawl = api.crawl.triggerBulkCrawl.useMutation({
		onSuccess: (data) => {
			toast.success("爬取任务已提交", {
				description: "正在后台处理...",
			});

			// Notify parent component and close dialog
			onCrawlSubmitted(data.handle?.id || "", data.token);
			onOpenChange(false);

			// Reset form
			setTimeout(() => {
				setUrls("");
				setSitemapUrl("");
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

	// tRPC mutation for fetching sitemap
	const fetchSitemap = api.crawl.fetchSitemap.useMutation({
		onSuccess: (data) => {
			if (data.urls.length === 0) {
				toast.error("解析错误", {
					description: "无法从Sitemap中提取有效的URL",
				});
				return;
			}

			// Add to URL input and switch to URL tab
			setUrls(data.urls.join("\n"));
			setActiveTab("urls");
			toast.success("Sitemap解析成功", {
				description: `已提取 ${data.count} 个URL`,
			});
		},
		onError: (error) => {
			toast.error("Sitemap处理失败", {
				description: error.message || "无法处理Sitemap",
			});
		},
	});

	// Reset state when dialog closes
	useEffect(() => {
		if (!open) {
			setTimeout(() => {
				if (!open) {
					setSubmitted(false);
					setIsLoading(false);
				}
			}, 300);
		}
	}, [open]);

	// Check if URL is valid
	function isValidUrl(urlString: string): boolean {
		try {
			const url = new URL(urlString);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}

	// Handle sitemap submission
	async function handleSitemapSubmit() {
		if (!sitemapUrl.trim()) {
			toast.error("输入错误", {
				description: "请输入Sitemap URL",
			});
			return;
		}

		if (!isValidUrl(sitemapUrl.trim())) {
			toast.error("输入错误", {
				description: "请输入有效的URL",
			});
			return;
		}

		// Use tRPC to fetch and parse the sitemap
		fetchSitemap.mutate({ sitemapUrl: sitemapUrl.trim() });
	}

	// Handle form submission
	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		if (!urls.trim()) {
			toast.error("输入错误", {
				description: "请输入至少一个URL",
			});
			return;
		}

		// Don't process if already submitted
		if (submitted || isLoading || triggerBulkCrawl.isPending) {
			return;
		}

		try {
			// Split and validate URLs
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

			// Use tRPC to submit bulk crawl task
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
						输入你想要爬取的网页URL，每行一个，或者提供一个Sitemap XML
						URL。系统将自动提取内容并添加到知识库。
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit}>
					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className="w-full"
					>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="urls">URL列表</TabsTrigger>
							<TabsTrigger value="sitemap">Sitemap XML</TabsTrigger>
						</TabsList>

						<TabsContent value="urls" className="pt-4">
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
								<p className="text-muted-foreground text-xs">
									当前已输入{urls.split("\n").length}个URL
								</p>
							</div>
						</TabsContent>

						<TabsContent value="sitemap" className="pt-4">
							<div className="space-y-4">
								<div className="grid gap-2">
									<Label htmlFor="sitemapUrl">Sitemap XML URL</Label>
									<div className="flex gap-2">
										<Input
											id="sitemapUrl"
											value={sitemapUrl}
											onChange={(e) => setSitemapUrl(e.target.value)}
											placeholder="https://example.com/sitemap.xml"
											className="flex-1"
										/>
										<Button
											type="button"
											variant="secondary"
											onClick={handleSitemapSubmit}
											disabled={fetchSitemap.isPending || !sitemapUrl.trim()}
										>
											{fetchSitemap.isPending ? "获取中..." : "提取URL"}
										</Button>
									</div>
									<p className="text-muted-foreground text-xs">
										提供一个指向Sitemap
										XML的URL，系统将自动提取其中的所有页面URL
									</p>
								</div>
							</div>
						</TabsContent>
					</Tabs>

					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							取消
						</Button>
						<Button
							type="submit"
							disabled={
								isLoading ||
								triggerBulkCrawl.isPending ||
								!urls.trim() ||
								fetchSitemap.isPending
							}
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
