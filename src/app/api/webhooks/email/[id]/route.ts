import { db } from "@/server/db";
import { freeEmails } from "@/server/db/schema";
import { replyEmail } from "@/trigger/reply-email";
import { wait } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { catchError, catchErrorSync } from "react-catch-error";
import { z } from "zod";

// Schema for formsubmit.co data structure
const formsubmitDataSchema = z.object({
	email: z.string().email(),
	name: z.string(),
	message: z.string(),
	attachment: z.any().optional(),
	_webhook: z.string().optional(),
	_custom_webhooks: z.string().optional(),
	_next: z.string().optional(),
	_captcha: z.string().optional(),
	_replyto: z.any().optional(),
	_template: z.string().optional(),
	_honey: z.any().optional(),
	_country: z.string().optional(),
});

// Schema for the incoming webhook payload
const webhookPayloadSchema = z.object({
	form_data: z.string(),
});

/**
 * Forward webhook to custom URLs
 */
async function forwardWebhook(
	url: string,
	payload: Record<string, unknown>,
): Promise<void> {
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			console.warn(`Failed to forward webhook to ${url}: ${response.status}`);
		} else {
			console.log(`Successfully forwarded webhook to ${url}`);
		}
	} catch (error) {
		console.error(`Error forwarding webhook to ${url}:`, error);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	console.log("FormSubmit.co webhook received");
	// Get id from params (this should be the alias from formsubmit.co)
	const { error: paramsError, data: paramsData } = await catchError(
		async () => {
			const { id } = await params;
			return { id };
		},
	);

	if (paramsError || !paramsData) {
		console.error("Error getting route parameters:", paramsError);
		return NextResponse.json(
			{ error: "Invalid request parameters" },
			{ status: 400 },
		);
	}

	const { id: alias } = paramsData;
	console.log("FormSubmit.co webhook received for alias:", alias);

	// Parse request body
	const { error: bodyError, data: body } = await catchError(async () => {
		const body = await request.json();
		return body;
	});

	if (bodyError || !body) {
		console.error("Error parsing request body:", bodyError);
		return NextResponse.json(
			{ error: "Invalid request body" },
			{ status: 400 },
		);
	}

	// Validate webhook payload structure
	const { error: payloadValidationError, data: webhookPayload } =
		catchErrorSync(() => webhookPayloadSchema.parse(body));

	if (payloadValidationError || !webhookPayload) {
		console.error("Webhook payload validation error:", payloadValidationError);
		return NextResponse.json(
			{ error: "Invalid webhook payload format" },
			{ status: 400 },
		);
	}

	// Parse the form_data JSON string
	const { error: formDataParseError, data: formData } = catchErrorSync(() =>
		JSON.parse(webhookPayload.form_data),
	);

	if (formDataParseError || !formData) {
		console.error("Error parsing form_data JSON:", formDataParseError);
		return NextResponse.json(
			{ error: "Invalid form_data JSON format" },
			{ status: 400 },
		);
	}

	// Validate form data against schema
	const { error: formValidationError, data: validatedFormData } =
		catchErrorSync(() => formsubmitDataSchema.parse(formData));

	if (formValidationError || !validatedFormData) {
		console.error("Form data validation error:", formValidationError);
		return NextResponse.json(
			{ error: "Invalid form data format" },
			{ status: 400 },
		);
	}

	// Handle custom webhooks forwarding
	if (validatedFormData._custom_webhooks) {
		const customWebhooks = validatedFormData._custom_webhooks
			.split(",")
			.map((url) => url.trim())
			.filter((url) => url.length > 0);

		console.log(`Forwarding to ${customWebhooks.length} custom webhooks`);

		// Forward to all custom webhooks (don't wait for completion)
		for (const webhookUrl of customWebhooks) {
			forwardWebhook(webhookUrl, {
				...validatedFormData,
				source: "formsubmit.co",
				originalPayload: body,
			}).catch((error) => {
				console.error(`Failed to forward to ${webhookUrl}:`, error);
			});
		}
	}

	// Find the free email configuration for this alias
	const { error: dbError, data: config } = await catchError(async () =>
		db.query.freeEmails.findFirst({
			where: eq(freeEmails.alias, alias),
			with: {
				agent: true,
			},
		}),
	);

	if (dbError) {
		console.error(
			`Database error while finding config for alias ${alias}:`,
			dbError,
		);
		return NextResponse.json(
			{ error: "Failed to retrieve email configuration" },
			{ status: 500 },
		);
	}

	if (!config) {
		console.log(`No email configuration found for alias: ${alias}`);
		// Still return success as the webhook forwarding might have worked
		return NextResponse.json({
			success: true,
			message: "Webhook processed (no email config found)",
			forwardedWebhooks: !!validatedFormData._custom_webhooks,
		});
	}

	// Create email payload for the old logic (simplified)
	const emailPayload = {
		email: validatedFormData.email,
		name: validatedFormData.name,
		message: validatedFormData.message,
		_country: validatedFormData._country,
	};

	// Create approval token for the email workflow
	const { error: tokenError, data: token } = await catchError(async () =>
		wait.createToken({
			tags: [`alias:${alias}`, `email:${emailPayload.email}`],
			timeout: "2d",
		}),
	);

	if (tokenError || !token) {
		console.error("Error creating approval token:", tokenError);
		return NextResponse.json(
			{ error: "Failed to create approval workflow" },
			{ status: 500 },
		);
	}

	console.log(
		`Created approval token ${token.id} for formsubmit.co alias ${alias}`,
	);

	// Trigger email response workflow with full agent support
	const { error: triggerError, data: handle } = await catchError(async () =>
		replyEmail.trigger({
			...emailPayload,
			agent: config.agent,
			notificationEmail: config.email,
			plunkApiKey: config.plunkApiKey,
			wechatPushApiKey: config.wechatPushApiKey || undefined,
			approvalTokenId: token.id,
		}),
	);

	if (triggerError || !handle) {
		console.error("Error triggering email reply:", triggerError);
		return NextResponse.json(
			{ error: "Failed to initiate email reply" },
			{ status: 500 },
		);
	}

	console.log(`Email reply task triggered with handle ID: ${handle.id}`);

	// Return success response
	return NextResponse.json({
		success: true,
		message: "Form submission processed successfully",
		handleId: handle.id,
		tokenId: token.id,
		forwardedWebhooks: !!validatedFormData._custom_webhooks,
	});
}

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { error: paramsError, data: paramsData } = await catchError(
		async () => {
			const { id } = await params;
			return { id };
		},
	);

	if (paramsError || !paramsData) {
		console.error("Error getting route parameters:", paramsError);
		return NextResponse.json(
			{ error: "Invalid request parameters" },
			{ status: 400 },
		);
	}

	const { id: alias } = paramsData;
	return NextResponse.json({
		message: `FormSubmit.co webhook endpoint is ready for alias: ${alias}`,
	});
}
