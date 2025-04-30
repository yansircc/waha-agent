"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebCrawlerDialog } from "../../hooks/web-crawler";
import { SitemapTab } from "./tabs/sitemap-tab";
import { UrlTab } from "./tabs/url-tab";
import type { WebCrawlerDialogProps } from "./utils/types";

export function WebCrawlerDialog({
	open,
	onOpenChange,
	onCrawlComplete,
	kbId,
}: WebCrawlerDialogProps) {
	const {
		tab,
		setTab,
		jobId,
		setJobId,
		isLoading,
		setIsLoading,
		result,
		setResult,
		handleClose,
	} = useWebCrawlerDialog(onOpenChange, onCrawlComplete);

	// Common props passed to all tab components
	const tabProps = {
		isLoading,
		setIsLoading,
		result,
		setResult,
		onCrawlComplete,
		handleClose,
		setJobId,
		setTab,
		kbId,
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>网页爬取</DialogTitle>
				</DialogHeader>

				<Tabs
					value={tab}
					onValueChange={(value) => setTab(value as "url" | "sitemap")}
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="url">单个URL</TabsTrigger>
						<TabsTrigger value="sitemap">Sitemap</TabsTrigger>
					</TabsList>

					<TabsContent value="url" className="mt-4">
						<UrlTab {...tabProps} />
					</TabsContent>

					<TabsContent value="sitemap" className="mt-4">
						<SitemapTab {...tabProps} />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
