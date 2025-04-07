"use server";

import { wahaAgent } from "@/mastra/agents";
import type { CoreMessage } from "@mastra/core";

// Generate a message with the AI
export async function generateMessage(
	messages: CoreMessage[],
	systemPrompt: string,
) {
	try {
		// Generate the response
		const response = await wahaAgent.generate(messages, {
			resourceId: "demo-resource",
			threadId: "demo-thread",
			system: systemPrompt,
		});

		// Return just the text
		return {
			text: response.text || "",
		};
	} catch (error) {
		console.error("Error in generateMessage:", error);
		return {
			text: "Sorry, there was an error processing your request.",
			error: true,
		};
	}
}
