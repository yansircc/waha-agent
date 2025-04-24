import { env } from "@/env";
import { pushWechatNotification } from "@/lib/push-wechat-notification";
import { sendEmail } from "@/lib/send-email";
import { type VercelAIAgentPayload, vercelAIAgent } from "@/lib/vercel-ai";
import { wait } from "@trigger.dev/sdk";
import { logger, task } from "@trigger.dev/sdk/v3";
import { type WebhookResponse, sendWebhookResponse } from "./utils";

export interface EmailFormPayload {
	email: string;
	name: string;
	message: string;
	_country?: string;
	webhookUrl?: string;
	agentId?: string;
	signature?: string | null;
	plunkApiKey?: string;
	wechatPushApiKey?: string;
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
	run: async (payload: EmailFormPayload) => {
		const {
			email,
			name,
			message,
			_country,
			webhookUrl,
			agentId,
			signature,
			plunkApiKey,
			wechatPushApiKey,
		} = payload;

		try {
			// Log start of processing
			logger.info("Starting email reply generation", {
				email,
				name,
				_country,
				messageLength: message.length,
				agentId,
			});

			// Create user prompt with customer details
			const country = _country || "Unknown";
			const userPrompt = [
				"I am a customer service representative. Please respond to this customer inquiry as if you are a customer support agent for a company that sells LED strips and lighting products. The customer details are below:",
				"",
				`Customer Name: ${name}`,
				`Customer Email: ${email}`,
				`Customer Country: ${country}`,
				`Message: ${message}`,
			].join("\n");

			// Prepare context for the AI agent
			const vercelAIAgentPayload: VercelAIAgentPayload = {
				messages: [
					{
						role: "user",
						content: userPrompt,
					},
				],
				userId: email,
				kbIds: [], // Use appropriate knowledge base IDs if needed
			};

			// Generate response using Vercel AI agent
			const result = await vercelAIAgent(vercelAIAgentPayload);

			// Extract the AI-generated response
			const responseText = result.text;

			// Add signature if provided
			const fullResponseText = signature
				? `${responseText}\n\n${signature}`
				: responseText;

			// Create a wait token for approval
			const token = await wait.createToken({
				tags: [`email:${email}`, `response-id:${Date.now()}`],
			});

			logger.info(`Created approval wait token: ${token.id}`);

			// Generate approval URL
			const approvalUrl = `${env.NEXT_PUBLIC_WEBHOOK_URL}/api/webhooks/email/approve/${token.id}`;

			// Create a message with the approval link and response preview in markdown format
			const notificationMessage = `
**AI Response Ready for Approval**

## From Customer: ${name} (${email})
${country ? `Country: ${country}` : ""}

## Customer Message: 
${message}

## AI Generated Response:
${responseText}

**Actions:**
[✅ Approve and Send Reply](${approvalUrl})

Token ID: ${token.id}
`;

			if (wechatPushApiKey) {
				// Send notification via WeChat
				await pushWechatNotification({
					title: `Email Response Approval: ${name}`,
					description: notificationMessage,
					apiKey: wechatPushApiKey,
				});
			}

			// Wait for token approval
			logger.info(`Waiting for approval token: ${token.id}`);
			const waitResult = await wait.forToken(token.id);

			if (!waitResult.ok) {
				// Token timed out or errored
				logger.error("Approval token timed out or errored", {
					tokenId: token.id,
					error: waitResult.error,
				});

				const errorResponse: EmailReplyWebhookResponse = {
					success: false,
					error: "Approval timed out or was rejected",
					email,
					name,
					messageReceived: message,
					responseGenerated: responseText,
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

			logger.info("Email approved, sending now", {
				tokenId: token.id,
				email,
			});

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

			// Prepare webhook response if a webhook URL was provided
			const responseData: EmailReplyWebhookResponse = {
				success: true,
				email,
				name,
				messageReceived: message,
				responseGenerated: responseText,
				emailSent: emailResult.success,
			};

			// Log success
			logger.info("Email reply completed", {
				email,
				name,
				responseLength: responseText.length,
				emailSent: emailResult.success,
			});

			// Send webhook response if URL was provided
			if (webhookUrl) {
				logger.debug("Sending webhook response", {
					url: webhookUrl,
					success: true,
				});
				await sendWebhookResponse<EmailReplyWebhookResponse>(
					webhookUrl,
					responseData,
				);
			}

			return responseData;
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
