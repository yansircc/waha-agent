import { getUploadPresignedUrl } from "@/lib/s3-service";
import { auth } from "@/server/auth";
import { type NextRequest, NextResponse } from "next/server";

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
	try {
		// Check authentication
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { fileName, fileType } = await request.json();

		if (!fileName || !fileType) {
			return NextResponse.json(
				{ error: "fileName and fileType are required" },
				{ status: 400 },
			);
		}

		// Use our s3-service to get a presigned URL
		const { url, key } = await getUploadPresignedUrl(fileName, fileType);

		return NextResponse.json({ url, key });
	} catch (error) {
		console.error("Presigned URL generation error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to generate upload URL",
			},
			{ status: 500 },
		);
	}
}

// Generate presigned URL for updating existing file
export async function PUT(request: NextRequest) {
	try {
		// Check authentication
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { fileName, fileType, documentId } = await request.json();

		if (!fileName || !fileType || !documentId) {
			return NextResponse.json(
				{ error: "fileName, fileType and documentId are required" },
				{ status: 400 },
			);
		}

		// Use our s3-service to get a presigned URL
		const { url, key } = await getUploadPresignedUrl(fileName, fileType);

		return NextResponse.json({ url, key });
	} catch (error) {
		console.error("Presigned URL generation error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to generate upload URL",
			},
			{ status: 500 },
		);
	}
}
