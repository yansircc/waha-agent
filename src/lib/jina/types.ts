// Types and interfaces for Jina crawler

export interface JinaCrawlResult {
	url: string;
	content: string;
	title: string;
	description: string;
	timestamp: string;
	success: boolean;
	error?: string;
}

// Job status type
export type JobStatus = "pending" | "processing" | "completed" | "failed";

// Options for crawling
export interface CrawlOptions {
	useAiCleaning?: boolean; // 是否使用AI清洗内容
}

export interface CrawlJob {
	id: string;
	url: string;
	timestamp: number;
	status: JobStatus;
	result?: JinaCrawlResult;
	error?: string;
	options?: CrawlOptions; // 爬取选项
}
