import { env } from "@/env";

// Base API client with common functionality for all WAHA API modules
export class BaseApiClient {
	protected apiKey: string;
	protected apiUrl: string;

	constructor() {
		this.apiKey = env.WAHA_API_KEY;
		this.apiUrl = env.NEXT_PUBLIC_WAHA_API_URL;
	}

	protected getHeaders(includeContentType = false): HeadersInit {
		const headers: HeadersInit = {
			Authorization: `Bearer ${this.apiKey}`,
		};

		if (includeContentType) {
			headers["Content-Type"] = "application/json";
		}

		return headers;
	}

	protected async get<T>(url: string): Promise<T> {
		const response = await fetch(`${this.apiUrl}${url}`, {
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.statusText}`);
		}

		return await response.json();
	}

	// Get a binary response and convert to base64
	protected async getBinary(
		url: string,
	): Promise<{ mimetype: string; data: string }> {
		const response = await fetch(`${this.apiUrl}${url}`, {
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.statusText}`);
		}

		// Get the content type
		const contentType =
			response.headers.get("content-type") || "application/octet-stream";

		// Get array buffer and convert to base64
		const buffer = await response.arrayBuffer();
		const base64 = Buffer.from(buffer).toString("base64");

		return {
			mimetype: contentType,
			data: base64,
		};
	}

	protected async post<T, D>(url: string, data?: D): Promise<T> {
		const response = await fetch(`${this.apiUrl}${url}`, {
			method: "POST",
			headers: this.getHeaders(!!data),
			...(data && { body: JSON.stringify(data) }),
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.statusText}`);
		}

		if (response.status === 204) {
			return {} as T; // No content
		}

		return await response.json();
	}

	protected async put<T, D>(url: string, data: D): Promise<T> {
		const response = await fetch(`${this.apiUrl}${url}`, {
			method: "PUT",
			headers: this.getHeaders(true),
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.statusText}`);
		}

		return await response.json();
	}

	protected async delete<T = void>(url: string): Promise<T> {
		const response = await fetch(`${this.apiUrl}${url}`, {
			method: "DELETE",
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.statusText}`);
		}

		if (response.status === 204) {
			return {} as T; // No content
		}

		// Try to parse JSON if we expect a return type other than void
		if (response.headers.get("content-type")?.includes("application/json")) {
			return await response.json();
		}

		return {} as T;
	}
}
