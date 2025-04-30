"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoaderCircle, Search } from "lucide-react";
import { useUrlSelection } from "../../../hooks/web-crawler";
import { formatUrlPath } from "../utils/format-url-path";

interface UrlSelectionProps {
	isLoading: boolean;
	urls: string[];
	onSelectUrls: (urls: string[]) => void;
	onCancel: () => void;
}

export function UrlSelection({
	isLoading,
	urls,
	onSelectUrls,
	onCancel,
}: UrlSelectionProps) {
	const {
		searchQuery,
		setSearchQuery,
		selectedUrls,
		filteredUrls,
		handleSelectAll,
		handleUrlToggle,
		allSelected,
	} = useUrlSelection(urls);

	return (
		<div className="space-y-4">
			<div className="mb-4">
				<p className="mb-2 text-muted-foreground text-sm">
					找到 {urls.length} 个URL。请选择要爬取的URL：
				</p>
				<div className="mb-4 flex items-center space-x-2">
					<div className="relative flex flex-1 items-center">
						<Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="搜索URL..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleSelectAll}
					>
						{allSelected ? "取消全选" : "全选"}
					</Button>
				</div>
			</div>

			<ScrollArea className="h-[300px] rounded-md border p-2">
				{filteredUrls.length > 0 ? (
					<ul className="space-y-2">
						{filteredUrls.map((url, index) => (
							<li
								key={`url-${index}-${url}`}
								className="flex items-start space-x-2 rounded px-2 py-1 hover:bg-muted/50"
							>
								<Checkbox
									id={`url-${index}-${url.substring(0, 20)}`}
									checked={selectedUrls.includes(url)}
									onCheckedChange={() => handleUrlToggle(url)}
									className="mt-1"
								/>
								<div className="flex-1 overflow-hidden">
									<Label
										htmlFor={`url-${index}-${url.substring(0, 20)}`}
										className="block cursor-pointer truncate font-normal text-sm"
										title={url} // 显示完整URL作为提示
									>
										{formatUrlPath(url)}
									</Label>
								</div>
							</li>
						))}
					</ul>
				) : (
					<div className="flex h-full items-center justify-center text-muted-foreground">
						{searchQuery ? "未找到匹配的URL" : "未找到URL"}
					</div>
				)}
			</ScrollArea>

			<div className="flex justify-between">
				<p className="text-muted-foreground text-sm">
					已选择 {selectedUrls.length} 个URL
				</p>
			</div>

			<div className="flex justify-end space-x-2">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isLoading}
				>
					取消
				</Button>
				<Button
					type="button"
					onClick={() => onSelectUrls(selectedUrls)}
					disabled={isLoading || selectedUrls.length === 0}
				>
					{isLoading ? (
						<>
							<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
							处理中...
						</>
					) : (
						"爬取选定URL"
					)}
				</Button>
			</div>
		</div>
	);
}
