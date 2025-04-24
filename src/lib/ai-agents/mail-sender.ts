import { createOpenAI } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";
import { sendEmail } from "../send-email";

// Define the tool to send emails
const createSendEmailTool = (plunkApiKey: string, signature?: string) => {
	return tool({
		description: "Send an email to the customer.",
		parameters: z.object({
			email: z.string().describe("The email address of the customer."),
			subject: z.string().describe("The subject of the email."),
			body: z.string().describe("The body of the email."),
		}),

		execute: async ({ email, subject, body }) => {
			try {
				const emailResult = await sendEmail(
					{
						to: email,
						subject,
						body,
						signature,
					},
					plunkApiKey,
				);

				return emailResult;
			} catch (error) {
				console.error("Email sending error:", error);
				return { success: false };
			}
		},
	});
};

export const mailSender = async (
	apiKey: string,
	plunkApiKey: string,
	mailContent: string,
	signature?: string,
) => {
	const openai = createOpenAI({
		apiKey,
		baseURL: "https://aihubmix.com/v1",
	});

	// Create the tool with the API key closure
	const sendEmailTool = createSendEmailTool(plunkApiKey, signature);

	const { toolResults } = await generateText({
		model: openai("gpt-4o-mini"),
		prompt: `
			As a proficient assistant, your task is to send emails using the 'sendEmailTool'. Format the email content minimally in HTML as follows:
			${mailContent}
		`,
		tools: {
			sendEmailTool,
		},
		toolChoice: "required",
	});

	return toolResults;
};
