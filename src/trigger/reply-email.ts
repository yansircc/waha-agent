import { env } from "@/env";
import {
	type KbSearcherPayload,
	kbSearcher,
} from "@/lib/ai-agents/kb-searcher";
import { mailSender } from "@/lib/ai-agents/mail-sender";
import { pushWechatNotification } from "@/lib/push-wechat-notification";
import type { Agent } from "@/types/agents";
import type { FormDataEmailPayload } from "@/types/email";
import { wait } from "@trigger.dev/sdk";
import { logger, task } from "@trigger.dev/sdk";
import type { WebhookResponse } from "./types";

interface EmailFormPayload extends FormDataEmailPayload {
	agent: Agent;
	signature?: string;
	plunkApiKey: string;
	wechatPushApiKey?: string;
	approvalTokenId: string;
}

// Extend the generic webhook response for email replies
interface EmailReplyWebhookResponse extends WebhookResponse {
	email: string;
	name: string;
	messageReceived: string;
	responseGenerated: string | undefined;
	emailSent: boolean | undefined;
}

export const replyEmail = task({
	id: "reply-email",
	onResume: async ({ wait }) => {
		console.log("Run resumed", wait);
	},
	run: async (payload: EmailFormPayload) => {
		const {
			email,
			name,
			message,
			_country,
			agent,
			signature,
			plunkApiKey,
			wechatPushApiKey,
			approvalTokenId,
		} = payload;

		try {
			// Log start of processing
			logger.info("Starting email reply generation", {
				email,
				name,
				_country,
				messageLength: message.length,
				agent,
				approvalTokenId,
			});

			// Create user prompt with customer details
			const country = _country || "Unknown";
			const userPrompt = `
Process the following email:
- Customer Name: ${name}
- Customer Email: ${email}
- Customer Country: ${country}
- Message: ${message}

Format the response as an email and ensure it aligns with the customer's message language.
			`;

			// Prepare context for the AI agent
			const kbSearcherPayload: KbSearcherPayload = {
				agent,
				messages: [
					{
						role: "user",
						content: userPrompt,
					},
				],
			};

			// Generate response using Vercel AI agent
			const { text } = await kbSearcher(kbSearcherPayload);

			const mailContent = `
			customerName: ${name}
			customerEmail: ${email}
			customerCountry: ${country}
			ourResponse: ${text}
			`;

			// Define the expected structure of the completion payload
			interface ApprovalPayload {
				status: "approved" | "rejected"; // Or whatever structure you use
				approvedAt?: string;
			}

			logger.info(
				`Using approval token ID received from payload: ${approvalTokenId}`,
			);

			// Generate approval URL using the passed ID
			const approvalUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/email/approve/${approvalTokenId}`;

			// Create a message with the approval link and response preview in markdown format
			const notificationMessage = `
**AI Response Ready for Approval**

From Customer: ${name} (${email})

${country ? `Country: ${country}` : ""}

Customer Message: 

${message}

**AI Generated Response:**

${text}

**Actions:**

[✅ Approve and Send Reply](${approvalUrl})

Token ID: ${approvalTokenId}
`;

			if (wechatPushApiKey) {
				// Send notification via WeChat
				await pushWechatNotification({
					title: `Email Response Approval: ${name}`,
					description: notificationMessage,
					apiKey: wechatPushApiKey,
				});
			}

			// Wait for the token using the passed ID
			const waitResult = await wait.forToken<ApprovalPayload>(approvalTokenId);
			if (waitResult.ok) {
				console.log("Token completed", waitResult.output.status); // "approved" or "rejected"
			}

			if (!waitResult.ok) {
				// Token timed out or errored
				logger.error("Approval token timed out or errored", {
					tokenId: approvalTokenId,
					error: waitResult.error,
				});

				const errorResponse: EmailReplyWebhookResponse = {
					success: false,
					error: `Approval failed: ${waitResult.error?.message || "Timeout"}`,
					email,
					name,
					messageReceived: message,
					responseGenerated: text,
					emailSent: false,
				};

				return errorResponse;
			}

			// Token completed successfully, now check the status from the payload
			if (waitResult.output.status === "approved") {
				const [emailResult] = await mailSender(
					agent.apiKey,
					plunkApiKey,
					mailContent,
					signature,
				);

				// Prepare webhook response if a webhook URL was provided
				const responseData: EmailReplyWebhookResponse = {
					success: true,
					email,
					name,
					messageReceived: message,
					responseGenerated: emailResult?.args.body,
					emailSent: emailResult?.result.success,
				};

				// Log success
				logger.info("Email reply completed successfully", {
					email,
					name,
					responseLength: emailResult?.args.body.length,
					emailSent: emailResult?.result.success,
				});

				return responseData;
			}

			// Handle other statuses (e.g., rejected) if the token was completed but not approved
			logger.warn("Token was completed but not approved", {
				tokenId: approvalTokenId,
				status: waitResult.output.status,
			});

			const rejectionResponse: EmailReplyWebhookResponse = {
				success: false,
				error: `Approval status: ${waitResult.output.status}`,
				email,
				name,
				messageReceived: message,
				responseGenerated: text, // Include the generated text even if rejected
				emailSent: false,
			};
			return rejectionResponse;
		} catch (error) {
			// Prepare error response
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const errorResponse: EmailReplyWebhookResponse = {
				success: false,
				error: errorMessage,
				email,
				name,
				messageReceived: message,
				responseGenerated: "",
				emailSent: false,
			};

			// Log error
			logger.error("Email reply generation failed", {
				error: errorMessage,
				email,
				name,
			});

			return errorResponse;
		}
	},
});
