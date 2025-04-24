import { env } from "@/env";
import { pushWechatNotification } from "@/lib/push-wechat-notification";
import { sendEmail } from "@/lib/send-email";
import { type VercelAIAgentPayload, vercelAIAgent } from "@/lib/vercel-ai";
import type { Agent } from "@/types/agents";
import type { FormDataEmailPayload } from "@/types/email";
import { wait } from "@trigger.dev/sdk";
import { logger, task } from "@trigger.dev/sdk";
import { type WebhookResponse, sendWebhookResponse } from "./utils";

export interface EmailFormPayload extends FormDataEmailPayload {
	webhookUrl?: string;
	agent: Agent;
	signature?: string | null;
	plunkApiKey: string;
	wechatPushApiKey?: string;
	approvalTokenId: string;
}

// Extend the generic webhook response for email replies
interface EmailReplyWebhookResponse extends WebhookResponse {
	email: string;
	name: string;
	messageReceived: string;
	responseGenerated: string;
	emailSent: boolean;
}

export const replyEmail = task({
	id: "reply-email",
	onWait: async ({ wait }) => {
		console.log("Run paused", wait);
	},
	onResume: async ({ wait }) => {
		console.log("Run resumed", wait);
	},
	run: async (payload: EmailFormPayload) => {
		const {
			email,
			name,
			message,
			_country,
			webhookUrl,
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

Format the response as an email (subject not required) and ensure it aligns with the customer's message language.
			`;

			// Prepare context for the AI agent
			const vercelAIAgentPayload: VercelAIAgentPayload = {
				agent,
				messages: [
					{
						role: "user",
						content: userPrompt,
					},
				],
			};

			// Generate response using Vercel AI agent
			const { text } = await vercelAIAgent(vercelAIAgentPayload);

			// Add signature if provided
			const fullResponseText = signature ? `${text}\n\n${signature}` : text;

			// Define the expected structure of the completion payload
			interface ApprovalPayload {
				status: "approved" | "rejected"; // Or whatever structure you use
				approvedAt?: string;
			}

			logger.info(
				`Using approval token ID received from payload: ${approvalTokenId}`,
			);

			// Generate approval URL using the passed ID
			const approvalUrl = `${env.NEXT_PUBLIC_WEBHOOK_URL}/api/webhooks/email/approve/${approvalTokenId}`;

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

				if (webhookUrl) {
					await sendWebhookResponse<EmailReplyWebhookResponse>(
						webhookUrl,
						errorResponse,
					);
				}
				return errorResponse;
			}

			// Token completed successfully, now check the status from the payload
			if (waitResult.output.status === "approved") {
				// Send the email reply
				const subject = "Re: Your inquiry about LED strips";

				const emailResult = await sendEmail(
					{
						to: email,
						subject,
						body: fullResponseText,
					},
					plunkApiKey,
				);

				logger.info("Email sending result", {
					success: emailResult.success,
					error: emailResult.error,
					details: emailResult,
				});

				// Prepare webhook response if a webhook URL was provided
				const responseData: EmailReplyWebhookResponse = {
					success: true,
					email,
					name,
					messageReceived: message,
					responseGenerated: text,
					emailSent: emailResult.success,
				};

				// Log success
				logger.info("Email reply completed successfully", {
					email,
					name,
					responseLength: text.length,
					emailSent: emailResult.success,
				});

				// Send webhook response if URL was provided
				if (webhookUrl) {
					logger.debug("Sending success webhook response", {
						url: webhookUrl,
						success: true,
					});
					await sendWebhookResponse<EmailReplyWebhookResponse>(
						webhookUrl,
						responseData,
					);
				}

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
			if (webhookUrl) {
				await sendWebhookResponse<EmailReplyWebhookResponse>(
					webhookUrl,
					rejectionResponse,
				);
			}
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

			// Send error webhook response if URL was provided
			if (webhookUrl) {
				logger.debug("Sending error webhook response", {
					url: webhookUrl,
					success: false,
				});
				await sendWebhookResponse<EmailReplyWebhookResponse>(
					webhookUrl,
					errorResponse,
				);
			}

			return errorResponse;
		}
	},
});
