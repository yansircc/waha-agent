import { env } from "@/env";

export async function sendEmail(
	to: string,
	subject: string,
	body: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await fetch("https://api.useplunk.com/v1/send", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.PLUNK_API_KEY}`,
			},
			body: JSON.stringify({
				to,
				subject,
				body,
			}),
		});
		return { success: true };
	} catch (error) {
		console.error(error);
		return { success: false, error: "Failed to send email" };
	}
}
