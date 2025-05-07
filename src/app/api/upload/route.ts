import { getUploadPresignedUrl } from "@/lib/s3-service";
import { auth } from "@/server/auth";
import { type NextRequest, NextResponse } from "next/server";
import { catchError } from "react-catch-error";

/**
 * API routes for getting presigned URLs for S3 uploads
 *
 * Note: These API routes are kept for backward compatibility.
 * New code should use the tRPC endpoints:
 * - api.s3.getUploadUrl.useMutation()
 *
 * Both implementations use the same underlying service (s3-service.ts).
 */

// Generate presigned URL for S3 upload
export async function POST(request: NextRequest) {
	const session = await auth();
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { error, data } = await catchError(async () => {
		const body = await request.json();
		return body;
	});

	if (error) {
		console.error("Request parsing error:", error);
		return NextResponse.json(
			{ error: "Invalid request format" },
			{ status: 400 },
		);
	}

	const { fileName, fileType } = data;

	if (!fileName || !fileType) {
		return NextResponse.json(
			{ error: "fileName and fileType are required" },
			{ status: 400 },
		);
	}

	const { error: uploadError, data: uploadData } = await catchError(async () =>
		getUploadPresignedUrl(fileName, fileType),
	);

	if (uploadError || !uploadData) {
		return NextResponse.json(
			{ error: uploadError?.message || "Failed to generate upload URL" },
			{ status: 500 },
		);
	}

	const { url, key } = uploadData;

	return NextResponse.json({ url, key });
}

// Generate presigned URL for updating existing file
export async function PUT(request: NextRequest) {
	const session = await auth();
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { error, data } = await catchError(async () => {
		const body = await request.json();
		return body;
	});

	if (error) {
		console.error("Request parsing error:", error);
		return NextResponse.json(
			{ error: "Invalid request format" },
			{ status: 400 },
		);
	}

	const { fileName, fileType, documentId } = data;

	if (!fileName || !fileType || !documentId) {
		return NextResponse.json(
			{ error: "fileName, fileType and documentId are required" },
			{ status: 400 },
		);
	}

	const { error: uploadError, data: uploadData } = await catchError(async () =>
		getUploadPresignedUrl(fileName, fileType),
	);

	if (uploadError || !uploadData) {
		return NextResponse.json(
			{ error: uploadError?.message || "Failed to generate upload URL" },
			{ status: 500 },
		);
	}

	const { url, key } = uploadData;

	return NextResponse.json({ url, key });
}
