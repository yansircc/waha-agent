import { db } from "@/server/db";
import { emailConfigs } from "@/server/db/schema";
import { replyEmail } from "@/trigger/reply-email";
import { formDataSchema } from "@/types/email";
import { wait } from "@trigger.dev/sdk";

import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { type NextRequest, NextResponse } from "next/server";
import { catchError, catchErrorSync } from "react-catch-error";

/**
 * Verifies the webhook signature from Form-Data
 * @param signature - The x-signature header value containing the JWT token
 * @param webhookSecret - The webhook secret for verification
 * @param formId - The expected form ID
 * @returns boolean indicating if the signature is valid
 */
function verifyWebhookSignature(
	signature: string | null,
	webhookSecret: string,
	formId: string,
): boolean {
	if (!signature) {
		console.error("Missing x-signature header");
		return false;
	}

	const { error, data: decoded } = catchErrorSync(
		() => jwt.verify(signature, webhookSecret) as { formid?: string },
	);

	if (error) {
		console.error("Invalid signature:", error);
		return false;
	}

	if (!decoded || decoded.formid !== formId) {
		console.error(`Invalid form ID: ${decoded?.formid}, expected: ${formId}`);
		return false;
	}

	return true;
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ formId: string }> },
) {
	// Get formId from params (wrapped in catchError to handle possible rejection)
	const { error: paramsError, data: paramsData } = await catchError(
		async () => {
			const { formId } = await params;
			return { formId };
		},
	);

	if (paramsError || !paramsData) {
		console.error("Error getting route parameters:", paramsError);
		return NextResponse.json(
			{ error: "Invalid request parameters" },
			{ status: 400 },
		);
	}

	const { formId } = paramsData;

	// Find the email configuration for this form
	const { error: dbError, data: config } = await catchError(async () =>
		db.query.emailConfigs.findFirst({
			where: eq(emailConfigs.formDataFormId, formId),
			with: {
				agent: true,
			},
		}),
	);

	if (dbError) {
		console.error(
			`Database error while finding config for formId ${formId}:`,
			dbError,
		);
		return NextResponse.json(
			{ error: "Failed to retrieve email configuration" },
			{ status: 500 },
		);
	}

	if (!config) {
		console.error(`No email configuration found for formId: ${formId}`);
		return NextResponse.json({ error: "Invalid form ID" }, { status: 404 });
	}

	// Get the signature from headers
	const signature = request.headers.get("x-signature");

	// Verify webhook signature using the config's secret
	if (
		!verifyWebhookSignature(
			signature,
			config.formDataWebhookSecret,
			config.formDataFormId,
		)
	) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	}

	// Parse JSON body
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

	// Validate payload against schema
	const { error: validationError, data: emailPayload } = catchErrorSync(() =>
		formDataSchema.parse(body),
	);

	if (validationError || !emailPayload) {
		console.error("Validation error:", validationError);
		return NextResponse.json(
			{ error: "Invalid email data format" },
			{ status: 400 },
		);
	}

	// Create the wait token
	const { error: tokenError, data: token } = await catchError(async () =>
		wait.createToken({
			tags: [`formId:${formId}`, `email:${emailPayload.email}`],
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
		`Created approval token ${token.id} in API route for form ${formId}`,
	);

	// Ensure emailPayload has all required fields for the trigger
	const safePayload = {
		...emailPayload,
		// Add any fields that might be undefined but required by trigger
	};

	// Trigger email response workflow
	const { error: triggerError, data: handle } = await catchError(async () =>
		replyEmail.trigger({
			...safePayload,
			agent: config.agent,
			signature: config.signature || undefined,
			plunkApiKey: config.plunkApiKey,
			wechatPushApiKey: config.wechatPushApiKey,
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
		message: "Email reply task initiated",
		handleId: handle.id,
		tokenId: token.id,
	});
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ formId: string }> },
) {
	// Get formId
	const { error: paramsError, data: paramsData } = await catchError(
		async () => {
			const { formId } = await params;
			return { formId };
		},
	);

	if (paramsError || !paramsData) {
		return NextResponse.json(
			{ error: "Invalid request parameters" },
			{ status: 400 },
		);
	}

	const { formId } = paramsData;

	return NextResponse.json({
		message: `Form-Data webhook endpoint is ready, formId: ${formId}`,
	});
}
