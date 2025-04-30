import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Sanitize a URL by detecting and fixing malformed patterns
 * @param url The URL to sanitize
 * @returns The sanitized URL
 */
export function sanitizeUrl(url: string): string {
	// Check for patterns like .xml followed by a date timestamp (common in malformed sitemaps)
	const xmlDatePattern =
		/\.xml(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2})/;
	if (xmlDatePattern.test(url)) {
		return url.replace(xmlDatePattern, ".xml");
	}

	// Check for patterns like .xml followed directly by a number
	const xmlNumberPattern = /\.xml(\d+)/;
	if (xmlNumberPattern.test(url)) {
		return url.replace(xmlNumberPattern, ".xml");
	}

	return url;
}

/**
 * 简单解析XML内容，提取指定标签内的内容
 * @param xmlText XML文本内容
 * @param tagName 要提取的标签名称
 * @returns 提取的内容数组
 */
export function parseXml(xmlText: string, tagName = "loc"): string[] {
	const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, "g");
	const matches = xmlText.match(regex);

	if (!matches) return [];

	return matches.map((match) => {
		const url = match
			.replace(new RegExp(`<${tagName}>|<\/${tagName}>`, "g"), "")
			.trim();

		// Sanitize the URL to fix malformed patterns
		return sanitizeUrl(url);
	});
}
