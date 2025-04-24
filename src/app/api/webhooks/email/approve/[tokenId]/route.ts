import { wait } from "@trigger.dev/sdk";
import type { NextRequest } from "next/server";
import { showErrorHtml, showExpiredHtml, showSuccessHtml } from "./show-result";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ tokenId: string }> },
) {
	const { tokenId } = await params;

	try {
		// Retrieve the token to check its status
		const token = await wait.retrieveToken(tokenId);

		if (!token || token.status !== "WAITING") {
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
		await wait.completeToken(tokenId, {
			status: "approved",
			approvedAt: new Date().toISOString(),
		});

		console.log(`Token ${tokenId} completed successfully`);

		// Return a success page
		return new Response(showSuccessHtml(email), {
			headers: {
				"Content-Type": "text/html; charset=UTF-8",
			},
		});
	} catch (error) {
		console.error("Error approving email:", error);
		return new Response(showErrorHtml(error as Error), {
			status: 500,
			headers: {
				"Content-Type": "text/html; charset=UTF-8",
			},
		});
	}
}
