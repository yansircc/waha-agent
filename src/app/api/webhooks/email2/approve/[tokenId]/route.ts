import { wait } from "@trigger.dev/sdk";
import type { NextRequest } from "next/server";
import { catchError } from "react-catch-error";
import { showErrorHtml, showExpiredHtml, showSuccessHtml } from "./show-result";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ tokenId: string }> },
) {
	const { error: paramsError, data: paramsData } = await catchError(
		async () => {
			const { tokenId } = await params;
			return { tokenId };
		},
	);

	if (paramsError || !paramsData) {
		console.error("Error getting route parameters:", paramsError);
		return new Response(showErrorHtml(paramsError as Error), {
			status: 400,
			headers: {
				"Content-Type": "text/html; charset=UTF-8",
			},
		});
	}

	const { error: tokenError, data: token } = await catchError(async () =>
		wait.retrieveToken(paramsData.tokenId),
	);

	if (tokenError || !token || token.status !== "WAITING") {
		// Token doesn't exist or has already been processed
		return new Response(showExpiredHtml(), {
			status: 400,
			headers: {
				"Content-Type": "text/html; charset=UTF-8",
			},
		});
	}

	// Find the email tag to extract the recipient email for the confirmation message
	const emailTag = token.tags.find((tag) => tag.startsWith("email:"));
	const email = emailTag ? emailTag.replace("email:", "") : "收件人";

	// Complete the token
	const { error: completeError, data: completeToken } = await catchError(
		async () =>
			wait.completeToken(paramsData.tokenId, {
				status: "approved",
				approvedAt: new Date().toISOString(),
			}),
	);

	if (completeError || !completeToken) {
		console.error("Error completing token:", completeError);
		return new Response(showErrorHtml(completeError as Error), {
			status: 500,
			headers: {
				"Content-Type": "text/html; charset=UTF-8",
			},
		});
	}

	// Return a success page
	return new Response(showSuccessHtml(email), {
		headers: {
			"Content-Type": "text/html; charset=UTF-8",
		},
	});
}
