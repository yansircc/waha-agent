import { db } from "@/server/db";
import { emailConfigs } from "@/server/db/schema";
import { replyEmail } from "@/trigger/reply-email";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { type NextRequest, NextResponse } from "next/server";

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

	try {
		const decoded = jwt.verify(signature, webhookSecret) as { formid?: string };

		if (decoded.formid !== formId) {
			console.error(`Invalid form ID: ${decoded.formid}, expected: ${formId}`);
			return false;
		}

		return true;
	} catch (error) {
		console.error("Invalid signature:", error);
		return false;
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ formId: string }> },
) {
	try {
		const { formId } = await params;

		// Find the email configuration for this form
		const config = await db.query.emailConfigs.findFirst({
			where: eq(emailConfigs.formDataFormId, formId),
			with: {
				agent: true,
			},
		});

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
		const body = await request.json();

		// Log the form submission data
		console.log("Form submission received:", JSON.stringify(body, null, 2));

		// Extract the required fields for the email
		const email = body.email;
		const name = body.name || email;
		const message = body.message;
		const country = body._country;

		if (!email || !message) {
			return NextResponse.json(
				{
					error: "Missing required fields (email, message)",
				},
				{ status: 400 },
			);
		}

		// Directly trigger the email reply task
		// This will generate the AI response, create the wait token, send notification, and wait for approval
		const handle = await replyEmail.trigger({
			email,
			name,
			message,
			_country: country,
			agentId: config.agentId,
			signature: config.signature,
			plunkApiKey: config.plunkApiKey,
			wechatPushApiKey: config.wechatPushApiKey,
		});

		console.log(`Email reply task triggered with handle ID: ${handle.id}`);

		// Return success response
		return NextResponse.json({
			success: true,
			message: "Email reply task initiated",
			handleId: handle.id,
		});
	} catch (error) {
		console.error("Error processing email webhook:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ formId: string }> },
) {
	// Get formId
	const { formId } = await params;

	return NextResponse.json({
		message: `Form-Data webhook endpoint is ready, formId: ${formId}`,
	});
}

// Form submission received: {
//   "email": "cnmarkyan@gmail.com",
//   "name": "John",
//   "message": "Hi,\r\nI was wondering what's the MOQ for your led stripes ship to US? This is a follow-up email.",
//   "_country": "US"
// }
