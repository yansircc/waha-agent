import { getLongLivedPresignedUrl } from "@/lib/s3-service";
import { auth } from "@/server/auth";
import { type NextRequest, NextResponse } from "next/server";
import { catchError } from "react-catch-error";

/**
 * Proxy API route for handling file uploads to S3/R2
 *
 * This endpoint solves CORS issues by:
 * 1. Receiving the file from the client
 * 2. Receiving the presigned URL (obtained via tRPC or regular API)
 * 3. Uploading to S3/R2 from the server-side, avoiding browser CORS restrictions
 * 4. Returning the result to the client
 *
 * This is used by useS3Upload hook to handle all file uploads in the application.
 */
export async function POST(request: NextRequest) {
	// Check authentication
	const session = await auth();
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	// Get form data
	const { error: formError, data: formDataResult } = await catchError(
		async () => request.formData(),
	);

	if (formError || !formDataResult) {
		console.error("Form data parsing error:", formError);
		return NextResponse.json(
			{ error: "Failed to parse form data" },
			{ status: 400 },
		);
	}

	const formData = formDataResult; // Now formData is definitely defined
	const file = formData.get("file") as File;
	const presignedUrl = formData.get("url") as string;
	const key = formData.get("key") as string;

	if (!file || !presignedUrl || !key) {
		return NextResponse.json(
			{ error: "Missing required fields" },
			{ status: 400 },
		);
	}

	// Upload to S3 from the server
	const { error: uploadError, data: uploadResponseResult } = await catchError(
		async () =>
			fetch(presignedUrl, {
				method: "PUT",
				body: file,
				headers: {
					"Content-Type": file.type,
				},
			}),
	);

	if (uploadError || !uploadResponseResult) {
		console.error("S3 upload network error:", uploadError);
		return NextResponse.json(
			{
				error: `Failed to connect to storage service: ${uploadError?.message || "Unknown error"}`,
			},
			{ status: 500 },
		);
	}

	const uploadResponse = uploadResponseResult; // Now uploadResponse is definitely defined

	if (!uploadResponse.ok) {
		const { error: textError, data: errorText } = await catchError(async () =>
			uploadResponse.text(),
		);

		console.error("S3 upload failed:", {
			status: uploadResponse.status,
			statusText: uploadResponse.statusText,
			errorText: textError ? "Could not read error details" : errorText,
		});

		return NextResponse.json(
			{
				error: `Failed to upload file to storage: ${uploadResponse.status} ${uploadResponse.statusText}`,
			},
			{ status: 500 },
		);
	}

	// Generate temporary URL
	const tempFileUrl = `${process.env.NEXT_PUBLIC_STORAGE_URL}/${key}`;

	// Generate 7-day long-lived access link
	const { error: urlError, data: longLivedUrl } = await catchError(async () =>
		getLongLivedPresignedUrl(key),
	);

	if (urlError) {
		console.error("Failed to generate long-lived URL:", urlError);
		// Continue with only temporary URL
	}

	// Log for debugging
	console.log("File uploaded successfully:", {
		key,
		tempFileUrl,
		longLivedUrl: longLivedUrl || "Failed to generate",
		expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
	});

	return NextResponse.json({
		success: true,
		key,
		fileUrl: tempFileUrl, // For backward compatibility
		longLivedUrl: longLivedUrl || tempFileUrl, // Fallback to temp URL if long-lived URL generation failed
		expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
	});
}
