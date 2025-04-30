"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FileText, LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import type { ReactElement } from "react";
import { useSitemapTab } from "../../../hooks/web-crawler";
import { UrlSelection } from "../components/url-selection";
import type { TabProps } from "../utils/types";

export function SitemapTab({
	isLoading: parentIsLoading,
	setIsLoading: setParentIsLoading,
	result: parentResult,
	setResult: setParentResult,
	handleClose,
	onCrawlComplete,
	setTab,
	setJobId,
	kbId,
}: TabProps) {
	const {
		sitemapUrl,
		setSitemapUrl,
		extractedUrls,
		errors,
		state,
		setState,
		progress,
		useAiCleaning,
		setUseAiCleaning,
		isLoading,
		result,
		handleSitemapParse,
		handleUrlSelection,
		SitemapState,
	} = useSitemapTab(onCrawlComplete, setJobId, kbId, setParentIsLoading);

	// Use useEffect to synchronize result state with parent
	useEffect(() => {
		if (result !== parentResult && Object.keys(result).length > 0) {
			setParentResult(result);
		}
	}, [result, parentResult, setParentResult]);

	// No need to manually sync isLoading state as it's now managed by the hook
	// if (isLoading !== parentIsLoading) {
	//   setParentIsLoading(isLoading);
	// }

	// Removed direct state update during render:
	// if (result !== parentResult && Object.keys(result).length > 0) {
	//   setParentResult(result);
	// }

	// 渲染URL输入表单
	const renderInputForm = (): ReactElement => (
		<form onSubmit={handleSitemapParse}>
			<div className="grid gap-4 py-4">
				<div className="grid gap-2">
					<Label htmlFor="sitemap">Sitemap URL</Label>
					<div className="flex items-center space-x-2">
						<FileText className="h-4 w-4 text-muted-foreground" />
						<Input
							id="sitemap"
							placeholder="https://example.com/sitemap.xml"
							value={sitemapUrl}
							onChange={(e) => setSitemapUrl(e.target.value)}
							disabled={isLoading}
							required
						/>
					</div>
					<p className="text-muted-foreground text-sm">
						解析 Sitemap 后，您可以选择要爬取的URL
					</p>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						id="aiCleaning"
						checked={useAiCleaning}
						onCheckedChange={(checked) => setUseAiCleaning(checked === true)}
						disabled={isLoading}
					/>
					<Label htmlFor="aiCleaning" className="font-normal text-sm">
						使用AI清洗优化内容 (推荐)
					</Label>
				</div>

				{result.message && (
					<div className="rounded-md bg-blue-50 p-3 text-blue-700 text-sm">
						{result.message}
					</div>
				)}

				{result.error && (
					<div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">
						{result.error}
					</div>
				)}

				{errors.length > 0 && (
					<div className="rounded-md bg-amber-50 p-3 text-amber-700 text-sm">
						<p className="mb-1 font-medium">处理时发生一些警告：</p>
						<ul className="list-disc space-y-1 pl-4">
							{errors.map((error, index) => (
								<li key={`error-${index}-${error.substring(0, 20)}`}>
									{error}
								</li>
							))}
						</ul>
					</div>
				)}
			</div>

			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					onClick={handleClose}
					disabled={isLoading}
				>
					取消
				</Button>
				<Button type="submit" disabled={!sitemapUrl || isLoading}>
					{isLoading ? (
						<>
							<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
							解析中...
						</>
					) : (
						"解析 Sitemap"
					)}
				</Button>
			</DialogFooter>
		</form>
	);

	// 渲染加载状态
	const renderLoading = (): ReactElement => (
		<div className="flex flex-col items-center justify-center py-8">
			<LoaderCircle className="mb-4 h-8 w-8 animate-spin text-primary" />
			<p>正在处理 Sitemap...</p>
		</div>
	);

	// 渲染爬取状态与进度条
	const renderCrawling = (): ReactElement => (
		<div className="flex flex-col items-center justify-center py-8">
			<div className="mb-6 w-full space-y-2">
				<div className="flex justify-between text-sm">
					<span>爬取进度</span>
					<span>{progress.percentage}%</span>
				</div>
				<Progress value={progress.percentage} className="h-2" />
				<div className="flex justify-between text-muted-foreground text-xs">
					<span>完成: {progress.completed}</span>
					<span>失败: {progress.failed}</span>
					<span>总计: {progress.total}</span>
				</div>
			</div>
			<p className="mb-2 text-center">正在爬取网页并创建合并文档...</p>
			<p className="text-center text-muted-foreground text-sm">
				这可能需要几分钟时间，请耐心等待
			</p>
		</div>
	);

	// 主渲染方法
	return (
		<>
			{state === SitemapState.INPUT && renderInputForm()}

			{state === SitemapState.PROCESSING && renderLoading()}

			{state === SitemapState.CRAWLING && renderCrawling()}

			{state === SitemapState.URL_SELECTION && (
				<UrlSelection
					isLoading={isLoading}
					urls={extractedUrls}
					onSelectUrls={handleUrlSelection}
					onCancel={() => setState(SitemapState.INPUT)}
				/>
			)}
		</>
	);
}
