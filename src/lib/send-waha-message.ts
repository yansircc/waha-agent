// {
//   "chatId": "你的号码@c.us",
//   "reply_to": null,
//   "text": "Hi there! Thank you for your inquiry from url：来源网址",
//   "linkPreview": false,
//   "session": "WhatsApp"
// }

// http://43.134.124.35:3002/api/sendText

// Interface for Waha message parameters
export interface WahaMessageParams {
	chatId: string;
	text: string;
	reply_to?: string | null;
	linkPreview?: boolean;
	session?: string;
}

/**
 * Sends a WhatsApp message through the Waha API
 * @param chatId Phone number with @c.us suffix or just the phone number
 * @param text Message text to send
 * @param options Additional options for the message
 * @returns Promise with success status and error message if applicable
 */
export async function sendWahaMessage(
	chatId: string,
	text: string,
	options: Partial<Omit<WahaMessageParams, "chatId" | "text">> = {},
): Promise<{ success: boolean; error?: string }> {
	try {
		// Add @c.us suffix if not present
		const formattedChatId = chatId.includes("@c.us")
			? chatId
			: `${chatId}@c.us`;

		const response = await fetch("http://43.134.124.35:3002/api/sendText", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				chatId: formattedChatId,
				text,
				reply_to: options.reply_to ?? null,
				linkPreview: options.linkPreview ?? false,
				session: options.session ?? "WhatsApp",
			}),
		});

		const data = await response.json();
		return data;
	} catch (error) {
		console.error(error);
		return { success: false, error: "Failed to send Waha message" };
	}
}

/**
 * Helper function to create a message with URL reference
 * @param chatId Phone number with or without @c.us suffix
 * @param url The source URL to include in the message
 * @param customMessage Optional custom message prefix
 * @returns Promise with success status and error message if applicable
 */
export async function sendWahaMessageWithUrl(
	chatId: string,
	url: string,
	customMessage = "Hi there! Thank you for your inquiry from url:",
): Promise<{ success: boolean; error?: string }> {
	const messageText = `${customMessage} ${url}`;
	return sendWahaMessage(chatId, messageText);
}
