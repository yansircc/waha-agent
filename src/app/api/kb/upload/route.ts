import path from "node:path";
import { kbService } from "@/lib/kb-service";
import { uploadLogger as logger } from "@/lib/logger";
import { getPresignedUrl, uploadFile } from "@/lib/s3-service";
import { auth } from "@/server/auth";
import { type NextRequest, NextResponse } from "next/server";

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
	TEXT: 4 * 1024 * 1024, // 4MB for text/markdown files
	OTHER: 1 * 1024 * 1024, // 1MB for other file types
};

// Text file types
const TEXT_FILE_TYPES = ["text/plain", "text/markdown", "application/markdown"];

export async function POST(req: NextRequest) {
	try {
		// Check auth
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const userId = session.user.id;

		// Parse form data
		const formData = await req.formData();
		const kbId = formData.get("kbId") as string;
		const file = formData.get("file") as File;

		// Validate required fields
		if (!kbId || !file) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		// Process file
		// Check file size
		const isTextFile = TEXT_FILE_TYPES.includes(file.type);
		const sizeLimit = isTextFile
			? FILE_SIZE_LIMITS.TEXT
			: FILE_SIZE_LIMITS.OTHER;

		if (file.size > sizeLimit) {
			return NextResponse.json(
				{
					error: `File size exceeds the limit of ${isTextFile ? "4MB" : "1MB"}`,
				},
				{ status: 400 },
			);
		}

		// Use file name directly as document name
		const name = file.name;

		// File metadata
		const fileSize = file.size;
		const fileType = file.type;
		const mimeType = file.type;

		// Create safe filename to use in storage
		const fileExt = path.extname(file.name);
		const safeFileName = `${Date.now()}-${name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}${fileExt}`;

		// Create R2 storage path: userId/kbId/filename
		const filePath = `${userId}/${kbId}/${safeFileName}`;

		logger.info(`Uploading file: ${filePath}`);

		// Upload file to R2
		await uploadFile(filePath, await file.arrayBuffer(), file.type);
		logger.info(`File uploaded successfully: ${filePath}`);

		// Generate a URL for accessing the file
		const fileUrl = await getPresignedUrl(filePath, 60 * 60 * 24 * 7); // 7-day expiry

		// Extract text content from text files if needed
		let content = "";
		if (isTextFile) {
			content = await file.text();
			logger.info(
				`Extracted text content from file: ${content.length} characters`,
			);
		}

		// Create document
		logger.info(`Creating document record with filePath: ${filePath}`);
		const document = await kbService.documents.create({
			name,
			content,
			kbId,
			fileUrl,
			filePath, // Important: Pass the filePath to the database
			fileType,
			fileSize,
			mimeType,
			isText: isTextFile,
			userId,
		});

		logger.info(`Document created with ID: ${document.id}`);

		return NextResponse.json(document);
	} catch (error) {
		logger.error("Error handling file upload:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}

export async function PUT(req: NextRequest) {
	try {
		// Check auth
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const userId = session.user.id;

		// Parse form data
		const formData = await req.formData();
		const id = formData.get("id") as string;
		const kbId = formData.get("kbId") as string;
		const file = formData.get("file") as File;

		// Validate required fields
		if (!id || !kbId || !file) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		// Check file size
		const isTextFile = TEXT_FILE_TYPES.includes(file.type);
		const sizeLimit = isTextFile
			? FILE_SIZE_LIMITS.TEXT
			: FILE_SIZE_LIMITS.OTHER;

		if (file.size > sizeLimit) {
			return NextResponse.json(
				{
					error: `File size exceeds the limit of ${isTextFile ? "4MB" : "1MB"}`,
				},
				{ status: 400 },
			);
		}

		// Use filename as document name
		const name = file.name;

		// File metadata
		const fileSize = file.size;
		const fileType = file.type;
		const mimeType = file.type;

		// Create safe filename
		const fileExt = path.extname(file.name);
		const safeFileName = `${Date.now()}-${name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}${fileExt}`;

		// Create R2 storage path: userId/kbId/filename
		const filePath = `${userId}/${kbId}/${safeFileName}`;

		logger.info(`Updating file: ${filePath}`);

		// Extract text content from text files if needed
		let content = "";
		if (isTextFile) {
			content = await file.text();
		}

		// Update document
		logger.info(`Updating document ID: ${id} with filePath: ${filePath}`);
		const document = await kbService.documents.update({
			id,
			name,
			content,
			file,
			fileType,
			fileSize,
			mimeType,
			filePath, // Important: Pass the filePath to the database
			kbId,
			userId,
		});

		if (!document) {
			return NextResponse.json(
				{ error: "Failed to update document" },
				{ status: 500 },
			);
		}

		logger.info(`Document updated successfully: ${document.id}`);

		return NextResponse.json(document);
	} catch (error) {
		logger.error("Error updating document:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
