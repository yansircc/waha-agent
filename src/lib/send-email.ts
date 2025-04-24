interface EmailPayload {
	to: string;
	subject: string;
	body: string;
}

export async function sendEmail(
	{ to, subject, body }: EmailPayload,
	plunkApiKey: string,
): Promise<{ success: boolean; error?: string }> {
	try {
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
				Authorization: `Bearer ${plunkApiKey}`,
			},
			body: JSON.stringify(payload),
		});
		return { success: true };
	} catch (error) {
		console.error(error);
		return { success: false, error: "Failed to send email" };
	}
}
