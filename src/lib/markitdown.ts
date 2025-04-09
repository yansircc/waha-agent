import { env } from "@/env";

export const convertToMarkdown = async (url: string): Promise<string> => {
	const response = await fetch(env.MARKITDOWN_API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ url }),
	});

	if (!response.ok) {
		throw new Error(`Failed to convert to markdown: ${response.statusText}`);
	}

	return await response.text();
};
