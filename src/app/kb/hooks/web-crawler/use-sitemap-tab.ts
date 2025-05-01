"use client";

import { api } from "@/utils/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { CrawlResult } from "../../components/web-crawler/utils/types";

// Sitemap Tab Hooks
enum SitemapState {
	INPUT = "input",
	URL_SELECTION = "url_selection",
	PROCESSING = "processing",
	CRAWLING = "crawling",
}

export function useSitemapTab(
	onCrawlComplete: (
		content: string,
		title: string,
		description?: string,
		fileUrl?: string,
	) => Promise<void>,
	setJobId: (jobId: string) => void,
	kbId?: string,
	setIsLoading?: (loading: boolean) => void,
) {
	const [sitemapUrl, setSitemapUrl] = useState("");
	const [extractedUrls, setExtractedUrls] = useState<string[]>([]);
	const [errors, setErrors] = useState<string[]>([]);
	const [state, setState] = useState<SitemapState>(SitemapState.INPUT);
	const [jobIds, setJobIds] = useState<string[]>([]);
	const [useAiCleaning, setUseAiCleaning] = useState(true);
	const [progress, setProgress] = useState({
		completed: 0,
		failed: 0,
		total: 0,
		percentage: 0,
	});
	const [progressChecking, setProgressChecking] = useState(false);
	const [domain, setDomain] = useState("");
	// Keep local isLoading state for backward compatibility, but use the parent's setter if provided
	const [isLoading, setLocalIsLoading] = useState(false);
	const [result, setResult] = useState<CrawlResult>({});
	const utils = api.useUtils();

	// Use parent's setIsLoading if provided
	const setEffectiveIsLoading = useCallback(
		(loading: boolean) => {
			setLocalIsLoading(loading);
			if (setIsLoading) {
				setIsLoading(loading);
			}
		},
		[setIsLoading],
	);

	// tRPC mutations
	const parseSitemapMutation = api.crawler.parseSitemap.useMutation();
	const queueUrlsMutation = api.crawler.queueUrls.useMutation();
	const combineDocumentMutation =
		api.crawler.combineAndCreateDocument.useMutation();

	// Use the new bulk status query
	const bulkJobStatusQuery = api.crawler.getBulkJobStatus.useQuery(
		{ jobIds },
		{
			enabled: state === SitemapState.CRAWLING && jobIds.length > 0,
			refetchInterval: progressChecking ? 5000 : false, // Check every 5 seconds
		},
	);

	// 处理Sitemap解析
	const handleSitemapParse = async (e: React.FormEvent) => {
		e.preventDefault();
		setEffectiveIsLoading(true); // Use the effective setter
		setResult({});
		setErrors([]);

		try {
			setState(SitemapState.PROCESSING);

			// 从sitemapUrl中提取域名以便后续使用
			try {
				const urlObj = new URL(sitemapUrl);
				setDomain(urlObj.hostname);
			} catch (e) {
				// 如果解析失败，使用通用名称
				setDomain("网站");
			}

			// 使用服务端API解析sitemap
			const parsedData = await parseSitemapMutation.mutateAsync({
				sitemapUrl,
				useAiCleaning,
			});

			if (parsedData.errors.length > 0) {
				setErrors(parsedData.errors);
			}

			if (parsedData.urls.length === 0) {
				setResult({
					error: "未从 Sitemap 中找到任何 URL",
				});
				setState(SitemapState.INPUT);
			} else {
				// 进入URL选择状态
				setExtractedUrls(parsedData.urls);
				setState(SitemapState.URL_SELECTION);
			}
		} catch (error) {
			console.error("处理 Sitemap 错误:", error);
			setResult({
				error: error instanceof Error ? error.message : "处理 Sitemap 失败",
			});
			setState(SitemapState.INPUT);
		} finally {
			setEffectiveIsLoading(false); // Use the effective setter
		}
	};

	// 处理URL选择并将所选URL添加到队列
	const handleUrlSelection = async (selectedUrls: string[]) => {
		if (selectedUrls.length === 0) return;

		setEffectiveIsLoading(true); // Use the effective setter
		setResult({});
		setJobIds([]);
		setProgress({
			completed: 0,
			failed: 0,
			total: selectedUrls.length,
			percentage: 0,
		});

		try {
			// 一次性将所有选定的URL加入队列
			const result = await queueUrlsMutation.mutateAsync({
				urls: selectedUrls,
				useAiCleaning,
			});

			// 存储任务ID以便跟踪
			if (result.jobIds.length > 0) {
				// Set jobIds first before changing state to avoid partial renders
				setJobIds(result.jobIds);

				// 显示toast提示
				toast.success("URLs已加入爬取队列", {
					description: `已将${result.jobIds.length}个URL加入队列处理。请耐心等待，系统会在后台处理您的请求。`,
					duration: 5000,
				});

				// Then after the jobIds are set, change the state in a separate render cycle
				setTimeout(() => {
					setState(SitemapState.CRAWLING);
					setProgressChecking(true);
				}, 0);
			}

			// 显示发生的任何错误
			if (result.failed && result.failed.length > 0) {
				const errorMessages = result.failed.map(
					(item) => `${item.url}: ${item.error}`,
				);
				setErrors(errorMessages);

				// 显示失败URL的提示
				if (result.failed.length > 0) {
					toast.warning(`${result.failed.length}个URL添加失败`, {
						description: "部分URL无法加入队列，请检查错误信息。",
					});
				}
			}
		} catch (error) {
			console.error("批量添加 URL 到队列错误:", error);
			setResult({
				error: error instanceof Error ? error.message : "添加 URL 到队列失败",
			});
			setState(SitemapState.INPUT);
			setEffectiveIsLoading(false); // Use the effective setter

			// 显示错误toast
			toast.error("添加URL到队列失败", {
				description:
					error instanceof Error ? error.message : "添加 URL 到队列失败",
			});
		}
	};

	// Monitor task progress using the bulk query results
	useEffect(() => {
		// Handle query error separately through the query result
		if (bulkJobStatusQuery.isError) {
			console.error(
				"Error fetching bulk job status:",
				bulkJobStatusQuery.error,
			);
			setResult({ error: "获取任务状态失败" });
			setProgressChecking(false);
			return;
		}

		if (state !== SitemapState.CRAWLING || !bulkJobStatusQuery.data?.jobs) {
			// If not crawling or no data yet, ensure checking is off or reset progress
			if (state !== SitemapState.CRAWLING) {
				setProgressChecking(false);
			}
			return;
		}

		const jobsData = bulkJobStatusQuery.data.jobs;
		let completed = 0;
		let failed = 0;
		let processing = 0;
		let pending = 0;

		const completedJobs: {
			jobId: string;
			url: string;
			content: string;
			title: string;
		}[] = [];

		// Use for...of instead of forEach
		for (const job of jobsData) {
			switch (job.status) {
				case "completed":
					completed++;
					// Ensure result and content exist before adding
					if (job.result?.content) {
						completedJobs.push({
							jobId: job.jobId,
							url: job.url ?? "N/A", // Use job.url if available
							content: job.result.content,
							title: job.result?.title || job.url || job.jobId, // Use title, fallback to url, then jobId
						});
					} else {
						// Treat as failed if completed but no content (could indicate an issue)
						failed++;
						console.warn(`Job ${job.jobId} completed but has no content.`);
					}
					break;
				case "failed":
					failed++;
					break;
				case "processing":
					processing++;
					break;
				case "pending": // Assuming 'pending' is a possible status from jinaCrawler
					pending++;
					break;
				// Combined not_found with default case to avoid "useless case clause" error
				default:
					// Handle unknown or not_found statuses
					pending++;
					break;
			}
		}

		// Calculate progress percentage
		const totalJobs = jobIds.length;
		// Give partial credit for processing jobs to show movement
		const completionValue = completed + failed + processing * 0.5;
		const newPercentage =
			totalJobs > 0 ? Math.round((completionValue / totalJobs) * 100) : 0;

		const newProgress = {
			completed,
			failed,
			total: totalJobs,
			percentage: newPercentage,
		};
		setProgress(newProgress);

		// Update status message
		if (processing > 0 || pending > 0) {
			setResult({
				message: `进度: ${completed}已完成, ${processing}处理中, ${failed}失败, ${pending}等待处理`,
			});
		}

		// Check if all jobs are finished (completed or failed)
		if (completed + failed === totalJobs && totalJobs > 0) {
			setProgressChecking(false); // Stop polling

			// Use a function outside the useEffect to avoid dependency issues
			// And use setTimeout to ensure state is updated in a separate cycle
			setTimeout(() => {
				handleJobsCompletion(completed, failed, totalJobs, completedJobs);
			}, 0);
		}
	}, [
		state,
		bulkJobStatusQuery.data,
		bulkJobStatusQuery.isError,
		bulkJobStatusQuery.error,
		jobIds,
	]);

	// Handler for when all jobs are completed, extracted outside the useEffect
	const handleJobsCompletion = useCallback(
		async (
			completed: number,
			failed: number,
			totalJobs: number,
			completedJobs: {
				jobId: string;
				url: string;
				content: string;
				title: string;
			}[],
		) => {
			setEffectiveIsLoading(true);
			try {
				if (completed > 0 && completedJobs.length > 0) {
					const combinedTitle = `${domain || "Website"} Sitemap Document`;

					if (!kbId) {
						throw new Error(
							"Knowledge base ID is missing, cannot create document.",
						);
					}

					const successJobIds = completedJobs.map((job) => job.jobId);
					// 创建文档并获取结果
					const result = await combineDocumentMutation.mutateAsync({
						jobIds: successJobIds,
						sitemapUrl,
						combinedTitle,
						kbId,
					});

					// Invalidate any relevant queries
					if (kbId && utils.kbs?.getDocuments) {
						await utils.kbs.getDocuments.invalidate({ kbId });
					}

					// 设置成功结果
					setResult({
						message: `成功创建了包含 ${completed} 个网页的合并文档${
							failed > 0 ? `，${failed} 个网页失败` : ""
						}`,
						success: true,
					});

					// 显示成功toast
					toast.success("爬取完成", {
						description: `成功创建了包含${completed}个网页的合并文档${
							failed > 0 ? `，${failed}个网页失败` : ""
						}`,
					});

					// 调用onCrawlComplete，传递文件URL以便更新UI
					if (onCrawlComplete) {
						await onCrawlComplete(
							"",
							combinedTitle,
							`已通过站点地图成功爬取 ${completed} 个网页并创建了合并文档`,
							result.document[0]?.fileUrl || sitemapUrl, // Use document's S3 URL
						);
					}
				} else if (failed === totalJobs) {
					setResult({
						error: "所有网页都爬取失败。",
					});

					// 显示失败toast
					toast.error("爬取失败", {
						description: "所有网页都爬取失败。",
					});
				} else {
					// This case might happen if completedJobs is empty but completed > 0
					setResult({
						error: "没有成功爬取任何内容可以合并。",
					});
					console.warn("爬取完成，但未收集到任何内容。");

					// 显示警告toast
					toast.warning("爬取结果为空", {
						description: "爬取完成，但未收集到任何内容可以合并。",
					});
				}
			} catch (error) {
				console.error("合并文档失败:", error);
				setResult({
					error: error instanceof Error ? error.message : "合并文档失败。",
				});

				// 显示错误toast
				toast.error("合并文档失败", {
					description:
						error instanceof Error ? error.message : "合并文档失败。",
				});
			} finally {
				// Reset state regardless of success/failure of combination
				setState(SitemapState.INPUT);
				setSitemapUrl("");
				setJobIds([]);
				setExtractedUrls([]);
				setEffectiveIsLoading(false);
			}
		},
		[
			domain,
			kbId,
			sitemapUrl,
			combineDocumentMutation,
			onCrawlComplete,
			setEffectiveIsLoading,
			utils,
		],
	);

	return {
		sitemapUrl,
		setSitemapUrl,
		extractedUrls,
		errors,
		state,
		setState,
		jobIds,
		progress,
		useAiCleaning,
		setUseAiCleaning,
		isLoading,
		setLocalIsLoading,
		result,
		setResult,
		handleSitemapParse,
		handleUrlSelection,
		SitemapState,
	};
}
