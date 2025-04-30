"use client";

import { useEffect, useState } from "react";

// URL Selection Hook
export function useUrlSelection(urls: string[]) {
	const [searchQuery, setSearchQuery] = useState("");
	// Initialize selectedUrls but also update it when urls changes with useEffect
	const [selectedUrls, setSelectedUrls] = useState<string[]>(urls);

	// Update selectedUrls when urls array changes - ONLY depend on urls changing, not selectedUrls
	useEffect(() => {
		// Only initialize selection when URLs list is first received or completely changes
		setSelectedUrls(urls);
		// This effect should only run when the urls array changes, not when selectedUrls changes
	}, [urls]);

	// 基于搜索查询过滤URL
	const filteredUrls = searchQuery
		? urls.filter((url) =>
				url.toLowerCase().includes(searchQuery.toLowerCase()),
			)
		: urls;

	// 处理全选切换
	const handleSelectAll = () => {
		setSelectedUrls(
			selectedUrls.length === filteredUrls.length ? [] : [...filteredUrls],
		);
	};

	// 处理单个URL选择
	const handleUrlToggle = (url: string) => {
		if (selectedUrls.includes(url)) {
			setSelectedUrls(selectedUrls.filter((item) => item !== url));
		} else {
			setSelectedUrls([...selectedUrls, url]);
		}
	};

	// 检查是否所有过滤的URL都被选中
	const allSelected =
		filteredUrls.length > 0 &&
		filteredUrls.every((url) => selectedUrls.includes(url));

	return {
		searchQuery,
		setSearchQuery,
		selectedUrls,
		setSelectedUrls,
		filteredUrls,
		handleSelectAll,
		handleUrlToggle,
		allSelected,
	};
}
