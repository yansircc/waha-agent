"use server";

import path from "node:path";
import { kbService } from "@/lib/kb-service";
import { uploadFile } from "@/lib/s3-service";

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
	TEXT: 10 * 1024 * 1024, // 10MB for text/markdown files
	OTHER: 5 * 1024 * 1024, // 5MB for other file types
} as const;

// Text file types
const TEXT_FILE_TYPES = [
	"text/plain",
	"text/markdown",
	"application/markdown",
] as const;

interface UploadInput {
	file: File;
	kbId: string;
	userId: string;
}

interface UpdateInput extends UploadInput {
	id: string;
}

async function validateFile(file: File) {
	const isTextFile = TEXT_FILE_TYPES.includes(
		file.type as (typeof TEXT_FILE_TYPES)[number],
	);
	const sizeLimit = isTextFile ? FILE_SIZE_LIMITS.TEXT : FILE_SIZE_LIMITS.OTHER;

	if (file.size > sizeLimit) {
		throw new Error(
			`File size exceeds the limit of ${isTextFile ? "10MB" : "5MB"}`,
		);
	}

	return {
		isTextFile,
		fileSize: file.size,
		fileType: file.type,
		mimeType: file.type,
	};
}

export async function uploadDocument({ file, kbId, userId }: UploadInput) {
	// Validate file
	const { isTextFile, fileSize, fileType, mimeType } = await validateFile(file);

	// Create safe filename to use in storage
	const fileExt = path.extname(file.name);
	// const fileExt = file.name.split(".").pop(); // TODO: 需要优化
	const safeFileName = `${Date.now()}-${file.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}${fileExt}`;

	// Create R2 storage path: userId/kbId/filename
	const filePath = `${userId}/${kbId}/${safeFileName}`;

	// Upload file to R2
	await uploadFile(filePath, await file.arrayBuffer(), file.type);

	// Extract text content from text files if needed
	let content = "";
	if (isTextFile) {
		content = await file.text();
	}

	// Create document
	const document = await kbService.documents.create({
		name: file.name,
		content,
		kbId,
		fileUrl: undefined, // We'll generate this when needed using getPresignedUrl
		filePath,
		fileType,
		fileSize,
		mimeType,
		isText: isTextFile,
		userId,
	});

	return document;
}

export async function updateDocument({ file, kbId, userId, id }: UpdateInput) {
	// Validate file
	const { isTextFile, fileSize, fileType, mimeType } = await validateFile(file);

	// Create safe filename
	const fileExt = path.extname(file.name);
	// const fileExt = file.name.split(".").pop(); // TODO: 需要优化
	const safeFileName = `${Date.now()}-${file.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}${fileExt}`;

	// Create R2 storage path: userId/kbId/filename
	const filePath = `${userId}/${kbId}/${safeFileName}`;

	// Upload file to R2
	await uploadFile(filePath, await file.arrayBuffer(), file.type);

	// Extract text content from text files if needed
	let content = "";
	if (isTextFile) {
		content = await file.text();
	}

	// Update document
	const document = await kbService.documents.update({
		id,
		name: file.name,
		content,
		kbId,
		fileUrl: undefined, // We'll generate this when needed using getPresignedUrl
		filePath,
		fileType,
		fileSize,
		mimeType,
		userId,
	});

	if (!document) {
		throw new Error("Failed to update document");
	}

	return document;
}
