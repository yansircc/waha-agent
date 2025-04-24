interface EmailPayload {
	to: string;
	subject: string;
	body: string;
}

export async function sendEmail(
	{ to, subject, body }: EmailPayload,
	ApiKey?: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Use the provided API key or fall back to the environment variable
		const apiKey = ApiKey;

		// Prepare the request payload
		const payload: EmailPayload = {
			to,
			subject,
			body,
		};

		// Make the API request
		await fetch("https://api.useplunk.com/v1/send", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(payload),
		});
		return { success: true };
	} catch (error) {
		console.error(error);
		return { success: false, error: "Failed to send email" };
	}
}
