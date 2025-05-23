import { z } from "zod";

/**
 * Format tool response text
 */
function formatToolResponse(text: string, isError = false) {
	return {
		content: [{ type: "text" as const, text }],
		isError,
	};
}

/**
 * Schema for WeChat notification parameters
 */
const wechatPushSchema = z.object({
	title: z.string(),
	description: z.string(),
});

/**
 * Interface for WeChat notification arguments including API key
 */
interface WechatPushArgs extends z.infer<typeof wechatPushSchema> {
	apiKey: string;
}

/**
 * Push a WeChat notification using ServerChan direct API
 */
export async function pushWechatNotification({
	title,
	description,
	apiKey,
}: WechatPushArgs) {
	try {
		// Use the direct ServerChan API endpoint with GET request
		const url = new URL(`https://sctapi.ftqq.com/${apiKey}.send`);
		url.searchParams.set("title", title);
		url.searchParams.set("desp", description);

		const response = await fetch(url.toString(), {
			method: "GET",
		});

		if (!response.ok) {
			console.error(
				`ServerChan notification failed for key starting with ${apiKey.substring(0, 4)}... HTTP Status: ${response.status}`,
			);
			return formatToolResponse(
				`Failed to push WeChat notification. HTTP Status: ${response.status}`,
				true,
			);
		}

		const result = await response.json();

		// ServerChan API returns { code: 0 } for success
		if (result.code === 0) {
			return formatToolResponse(
				`WeChat notification sent successfully. Message: ${result.message || "Success"}`,
			);
		}

		console.error(
			`ServerChan notification failed for key starting with ${apiKey.substring(0, 4)}... Code: ${result.code}, Message: ${result.message}`,
		);
		return formatToolResponse(
			`Failed to push WeChat notification. Error: ${result.message || "Unknown error"} (Code: ${result.code})`,
			true,
		);
	} catch (error) {
		console.error("Error pushing wechat notification:", error);
		return formatToolResponse(
			`Error pushing wechat notification: ${error instanceof Error ? error.message : String(error)}`,
			true,
		);
	}
}
