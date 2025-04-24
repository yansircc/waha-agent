import { wait } from "@trigger.dev/sdk";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	request: NextRequest,
	{ params }: { params: { tokenId: string } },
) {
	const { tokenId } = params;

	try {
		// Retrieve the token to check its status
		const token = await wait.retrieveToken(tokenId);

		if (!token || token.status !== "WAITING") {
			// Token doesn't exist or has already been processed
			return new Response(
				`
        <html>
          <head>
            <title>Invalid or Expired Token</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
              .error { color: #e11d48; }
              .info { color: #6b7280; }
            </style>
          </head>
          <body>
            <h1 class="error">Invalid or Expired Token</h1>
            <p class="info">This approval link is no longer valid. The email may have already been approved or the approval window has expired.</p>
          </body>
        </html>
      `,
				{
					status: 400,
					headers: {
						"Content-Type": "text/html",
					},
				},
			);
		}

		// Find the email tag to extract the recipient email for the confirmation message
		const emailTag = token.tags.find((tag) => tag.startsWith("email:"));
		const email = emailTag ? emailTag.replace("email:", "") : "the recipient";

		// Complete the token
		await wait.completeToken(tokenId, {
			status: "approved",
			approvedAt: new Date().toISOString(),
		});

		console.log(`Token ${tokenId} completed successfully`);

		// Return a success page
		return new Response(
			`
      <html>
        <head>
          <title>Email Reply Approved</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
            .success { color: #10b981; }
            .info { color: #6b7280; }
          </style>
        </head>
        <body>
          <h1 class="success">Email Reply Approved!</h1>
          <p>Your approval has been received. The system will now send the reply to <strong>${email}</strong>.</p>
          <p class="info">You can close this window now.</p>
        </body>
      </html>
    `,
			{
				headers: {
					"Content-Type": "text/html",
				},
			},
		);
	} catch (error) {
		console.error("Error approving email:", error);
		return new Response(
			`
      <html>
        <head>
          <title>Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
            .error { color: #e11d48; }
          </style>
        </head>
        <body>
          <h1 class="error">Error Processing Approval</h1>
          <p>There was an error processing your approval request.</p>
          <p>${error instanceof Error ? error.message : String(error)}</p>
        </body>
      </html>
    `,
			{
				status: 500,
				headers: {
					"Content-Type": "text/html",
				},
			},
		);
	}
}
