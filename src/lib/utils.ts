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
