import { auth } from "@/server/auth";
import { type NextRequest, NextResponse } from "next/server";

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
	try {
		// Check authentication
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get("file") as File;
		const presignedUrl = formData.get("url") as string;
		const key = formData.get("key") as string;

		if (!file || !presignedUrl || !key) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		// Upload to S3 from the server instead of the client
		const response = await fetch(presignedUrl, {
			method: "PUT",
			body: file,
			headers: {
				"Content-Type": file.type,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("S3 upload failed:", {
				status: response.status,
				statusText: response.statusText,
				errorText,
			});

			return NextResponse.json(
				{
					error: `Failed to upload file to storage: ${response.status} ${response.statusText}`,
				},
				{ status: 500 },
			);
		}

		// Generate the file URL
		const fileUrl = `${process.env.NEXT_PUBLIC_STORAGE_URL}/${key}`;

		return NextResponse.json({
			success: true,
			key,
			fileUrl,
		});
	} catch (error) {
		console.error("Proxy upload error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to upload file via proxy",
			},
			{ status: 500 },
		);
	}
}
