export interface WebCrawlerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCrawlComplete: (
		content: string,
		title: string,
		description?: string,
		fileUrl?: string,
	) => Promise<void>;
	kbId?: string;
}

export interface CrawlResult {
	content?: string;
	title?: string;
	description?: string;
	error?: string;
	message?: string;
	jobId?: string;
	jobStatus?: string;
	success?: boolean;
}

export interface JobResult {
	content: string;
	title?: string;
	description?: string;
	success: boolean;
}

export interface Job {
	url: string;
	status: string;
	timestamp: string;
	error?: string;
	result?: JobResult;
}

export type TabType = "url" | "sitemap";

export interface TabProps {
	isLoading: boolean;
	setIsLoading: (isLoading: boolean) => void;
	result: CrawlResult;
	setResult: (result: CrawlResult) => void;
	onCrawlComplete: (
		content: string,
		title: string,
		description?: string,
		fileUrl?: string,
	) => Promise<void>;
	handleClose: () => void;
	setJobId: (jobId: string) => void;
	setTab: (tab: TabType) => void;
	kbId?: string;
}
