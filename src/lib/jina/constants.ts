// Constants for Jina crawler

export const JINA_CRAWL_PREFIX = "jina:crawl";
export const JINA_RATE_LIMIT_KEY = "jina:ratelimit:counter";
export const JINA_QUEUE_KEY = "jina:crawl:queue";
export const MAX_RPM = 200; // Maximum requests per minute
export const REQUEST_TIMEOUT = 30000; // 30 seconds timeout for fetch requests
export const MAX_CONCURRENT_TASKS = 10; // 最大并发任务数
