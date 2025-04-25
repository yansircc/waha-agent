"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Kb } from "@/types/kb";
import { api } from "@/utils/api";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";

interface KbSearchDialogProps {
	kb: Kb;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface SearchResult {
	id: string;
	score: number;
	payload: {
		text: string;
		[key: string]: unknown;
	};
	metadata?: {
		raw_rrf_score?: number;
		source?: "vector" | "keyword";
		vector_rank?: number;
		keyword_rank?: number;
	};
}

interface SearchDetails {
	totalResults: number;
	returnedResults: number;
	vectorResultsCount: number;
	keywordResultsCount: number;
	normalizationMethod: "none" | "percentage" | "exponential";
	searchedKbs: string[];
}

export function KbSearchDialog({
	kb,
	open,
	onOpenChange,
}: KbSearchDialogProps) {
	const [query, setQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
	const [searchDetails, setSearchDetails] = useState<SearchDetails | null>(
		null,
	);

	// Create a tRPC mutation for kb search that will run on the server
	const kbSearchMutation = api.qdrant.kbSearch.useMutation({
		onSuccess: (data) => {
			setSearchResults(data.results);
			setSearchDetails({
				vectorResultsCount: data.fusionDetails.vectorResultsCount,
				keywordResultsCount: data.fusionDetails.keywordResultsCount,
				totalResults: data.fusionDetails.totalResults,
				returnedResults: data.fusionDetails.returnedResults,
				normalizationMethod: data.fusionDetails.normalizationMethod,
				searchedKbs: data.fusionDetails.searchedKbs || [kb.id],
			});
			setIsSearching(false);
		},
		onError: (error) => {
			console.error("Search error:", error);
			setIsSearching(false);
		},
	});

	const handleSearch = async () => {
		if (!query.trim()) return;

		setIsSearching(true);
		setSearchResults([]);
		setSearchDetails(null);

		// Send the query string to the server
		kbSearchMutation.mutate({
			query: query.trim(),
			kbId: kb.id,
			limit: 5,
			scoreNormalization: "percentage", // 默认使用百分比归一化
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[80vh] max-w-3xl flex-col">
				<DialogHeader>
					<DialogTitle>搜索知识库: {kb.name}</DialogTitle>
					<DialogDescription>
						在不涉及AI的情况下测试你的知识库检索
					</DialogDescription>
				</DialogHeader>

				<div className="my-4 flex items-center gap-2">
					<Input
						placeholder="输入搜索查询..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSearch();
						}}
					/>
					<Button onClick={handleSearch} disabled={isSearching}>
						{isSearching ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Search className="h-4 w-4" />
						)}
					</Button>
				</div>

				{searchResults.length > 0 && (
					<ScrollArea className="flex-1">
						<SearchResultsList results={searchResults} />
					</ScrollArea>
				)}
			</DialogContent>
		</Dialog>
	);
}

function SearchResultsList({ results }: { results: SearchResult[] }) {
	if (results.length === 0) {
		return (
			<div className="py-8 text-center text-muted-foreground">没有结果</div>
		);
	}

	return (
		<Accordion type="single" collapsible className="w-full">
			{results.map((result, index) => (
				<AccordionItem key={`${result.id}-${index}`} value={`item-${index}`}>
					<AccordionTrigger className="flex items-center">
						<div className="flex items-center gap-2">
							<span className="font-medium">Result {index + 1}</span>
							<Badge variant="outline">Score: {result.score.toFixed(2)}</Badge>
							{result.metadata?.source && (
								<Badge
									variant={
										result.metadata.source === "vector"
											? "secondary"
											: "default"
									}
									className="text-xs"
								>
									{result.metadata.source}
								</Badge>
							)}
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div className="space-y-2">
							<div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
								{result.payload.text}
							</div>

							{/* 展示元数据 */}
							<div className="space-y-1 text-xs">
								<div className="text-muted-foreground">
									<strong>文档元数据:</strong>{" "}
									{Object.entries(result.payload)
										.filter(([key]) => key !== "text")
										.map(([key, value]) => `${key}: ${value}`)
										.join(", ")}
								</div>

								{result.metadata && (
									<div className="text-muted-foreground">
										<strong>搜索元数据:</strong>{" "}
										{result.metadata.source && (
											<span>来源: {result.metadata.source}, </span>
										)}
										{typeof result.metadata.vector_rank === "number" &&
											result.metadata.vector_rank >= 0 && (
												<span>向量排名: {result.metadata.vector_rank}, </span>
											)}
										{typeof result.metadata.keyword_rank === "number" &&
											result.metadata.keyword_rank >= 0 && (
												<span>
													关键词排名: {result.metadata.keyword_rank},{" "}
												</span>
											)}
										{result.metadata.raw_rrf_score && (
											<span>
												原始分数: {result.metadata.raw_rrf_score.toFixed(4)}
											</span>
										)}
									</div>
								)}
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}
