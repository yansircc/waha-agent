"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useUrlTab } from "../../../hooks/web-crawler";
import type { TabProps } from "../utils/types";

export function UrlTab({
	isLoading: parentIsLoading,
	setIsLoading: setParentIsLoading,
	result: parentResult,
	setResult: setParentResult,
	onCrawlComplete,
	handleClose,
	setJobId,
}: TabProps) {
	const {
		url,
		setUrl,
		queueOnly,
		setQueueOnly,
		useAiCleaning,
		setUseAiCleaning,
		result,
		handleSubmit,
	} = useUrlTab(onCrawlComplete, setJobId, setParentIsLoading);

	// Use parentIsLoading directly instead of local isLoading
	const isLoading = parentIsLoading;

	// Use useEffect to synchronize result state with parent
	useEffect(() => {
		if (result !== parentResult && Object.keys(result).length > 0) {
			setParentResult(result);
		}
	}, [result, parentResult, setParentResult]);

	return (
		<form onSubmit={handleSubmit}>
			<div className="grid gap-4 py-4">
				<div className="grid gap-2">
					<Label htmlFor="url">输入网址</Label>
					<div className="flex items-center space-x-2">
						<Globe className="h-4 w-4 text-muted-foreground" />
						<Input
							id="url"
							placeholder="https://example.com"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							disabled={isLoading}
							required
						/>
					</div>
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
				{result.content && (
					<div className="mt-2 space-y-2">
						{result.title && (
							<div>
								<Label className="text-sm">标题</Label>
								<div className="font-medium text-sm">{result.title}</div>
							</div>
						)}

						{result.description && (
							<div>
								<Label className="text-sm">描述</Label>
								<div className="text-muted-foreground text-sm">
									{result.description}
								</div>
							</div>
						)}

						<div>
							<Label>内容预览</Label>
							<Textarea
								value={
									result.content.slice(0, 300) +
									(result.content.length > 300 ? "..." : "")
								}
								readOnly
								className="mt-1 h-24"
							/>
						</div>
					</div>
				)}

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
				<Button type="submit" disabled={!url || isLoading}>
					{isLoading ? (
						<>
							<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
							爬取中...
						</>
					) : (
						"开始爬取"
					)}
				</Button>
			</DialogFooter>
		</form>
	);
}
