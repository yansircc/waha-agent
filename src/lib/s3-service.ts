import { env } from "@/env";
import { s3Logger as logger } from "@/lib/logger";
import { S3Client } from "@aws-sdk/client-s3";
import {
	DeleteObjectCommand,
	GetObjectCommand,
	type GetObjectCommandInput,
	HeadObjectCommand,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 一周的秒数
export const ONE_WEEK_IN_SECONDS = 7 * 24 * 60 * 60; // 7天
// 最长有效期 - AWS 限制为7天
export const MAX_PRESIGNED_URL_EXPIRY = ONE_WEEK_IN_SECONDS;

interface S3Config {
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	bucket: string;
	region?: string;
}

// Configuration for Cloudflare R2
const s3Config: S3Config = {
	accessKeyId: env.R2_ACCESS_KEY_ID,
	secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	endpoint: env.R2_ENDPOINT,
	bucket: env.R2_BUCKET,
	region: "auto", // R2 defaults to auto region
};

// Create S3 client with AWS SDK
const s3Client = new S3Client({
	credentials: {
		accessKeyId: s3Config.accessKeyId,
		secretAccessKey: s3Config.secretAccessKey,
	},
	endpoint: s3Config.endpoint,
	region: s3Config.region || "us-east-1", // Default region if not specified
	forcePathStyle: true, // Needed for most S3-compatible services
});

/**
 * Upload a file to S3
 * @param key - The file path/name in S3
 * @param data - The file content to upload
 * @param contentType - Optional content type
 * @returns Promise with the number of bytes written
 */
export async function uploadFile(
	key: string,
	data: string | Uint8Array | ArrayBuffer | Blob | Response | Request,
	contentType?: string,
): Promise<number> {
	let body: Buffer | Blob | string;

	if (typeof data === "string") {
		body = data;
	} else if (data instanceof Blob) {
		body = data;
	} else if (data instanceof Response) {
		const arrayBuffer = await data.arrayBuffer();
		body = Buffer.from(new Uint8Array(arrayBuffer));
	} else if (data instanceof Request) {
		const arrayBuffer = await data.arrayBuffer();
		body = Buffer.from(new Uint8Array(arrayBuffer));
	} else if (data instanceof ArrayBuffer) {
		body = Buffer.from(new Uint8Array(data));
	} else if (ArrayBuffer.isView(data)) {
		body = Buffer.from(data as Uint8Array);
	} else {
		throw new Error("Unsupported data type");
	}

	const command = new PutObjectCommand({
		Bucket: s3Config.bucket,
		Key: key,
		Body: body,
		ContentType: contentType,
	});

	try {
		await s3Client.send(command);

		// Return approximate data size
		if (typeof body === "string") {
			return Buffer.byteLength(body);
		}

		if (body instanceof Blob) {
			return body.size;
		}

		// Must be Buffer at this point
		return body.length;
	} catch (error) {
		logger.error(`Error uploading file to S3 (key: ${key}):`, error);
		throw new Error(
			`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Get a file from S3
 * @param key - The file path/name in S3
 * @returns Promise with the file content
 */
export async function getFile<T = unknown>(
	key: string,
	format: "json" | "text" | "buffer" = "json",
): Promise<T> {
	const command = new GetObjectCommand({
		Bucket: s3Config.bucket,
		Key: key,
	});

	try {
		const response = await s3Client.send(command);
		const data = await response.Body?.transformToByteArray();

		if (!data) {
			throw new Error(`File ${key} is empty or doesn't exist`);
		}

		if (format === "json") {
			const text = new TextDecoder().decode(data);
			return JSON.parse(text) as T;
		}

		if (format === "text") {
			return new TextDecoder().decode(data) as unknown as T;
		}

		return Buffer.from(data) as unknown as T;
	} catch (error) {
		logger.error(`Error getting file ${key}:`, error);
		throw new Error(
			`Failed to get file: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Check if a file exists in S3
 * @param key - The file path/name in S3
 * @returns Promise with boolean indicating if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
	const command = new HeadObjectCommand({
		Bucket: s3Config.bucket,
		Key: key,
	});

	try {
		await s3Client.send(command);
		return true;
	} catch (error) {
		// No need to log this error as it's expected when file doesn't exist
		return false;
	}
}

/**
 * Delete a file from S3
 * @param key - The file path/name in S3
 * @returns Promise that resolves when file is deleted
 */
export async function deleteFile(key: string): Promise<void> {
	const exists = await fileExists(key);

	if (!exists) {
		logger.info(`File does not exist, nothing to delete: ${key}`);
		return;
	}

	const command = new DeleteObjectCommand({
		Bucket: s3Config.bucket,
		Key: key,
	});

	try {
		logger.info(`Deleting file: ${key}`);
		await s3Client.send(command);
		logger.info(`File deleted successfully: ${key}`);
	} catch (error) {
		logger.error(`Error deleting file: ${key}`, error);
		throw new Error(
			`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Generate a presigned URL for downloading a file
 * @param key - The file path/name in S3
 * @param expiresIn - Time in seconds until the URL expires (default: 1 hour, max: 7 days)
 * @param acl - Access control list for the file
 * @returns Promise with the presigned URL for downloading
 */
export async function getPresignedUrl(
	key: string,
	expiresIn = 3600,
	acl:
		| "public-read"
		| "private"
		| "public-read-write"
		| "aws-exec-read"
		| "authenticated-read"
		| "bucket-owner-read"
		| "bucket-owner-full-control"
		| "log-delivery-write" = "public-read",
): Promise<string> {
	try {
		// 确保过期时间不超过最大值（7天）
		const validExpiresIn = Math.min(expiresIn, MAX_PRESIGNED_URL_EXPIRY);

		const commandInput: GetObjectCommandInput & { ACL?: string } = {
			Bucket: s3Config.bucket,
			Key: key,
			ACL: acl,
		};

		const command = new GetObjectCommand(commandInput);

		return getSignedUrl(s3Client, command, { expiresIn: validExpiresIn });
	} catch (error) {
		logger.error(`Error generating presigned URL for ${key}:`, error);
		throw new Error(
			`Failed to generate download URL: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Generate a long-lived presigned URL (7 days) for downloading a file
 * 适合生成较长时间有效的分享链接
 *
 * @param key - The file path/name in S3
 * @returns Promise with the presigned URL that is valid for 7 days
 */
export async function getLongLivedPresignedUrl(key: string): Promise<string> {
	try {
		return await getPresignedUrl(key, ONE_WEEK_IN_SECONDS);
	} catch (error) {
		logger.error(
			`Error generating long-lived presigned URL for ${key}:`,
			error,
		);
		throw new Error(
			`Failed to generate 7-day access URL: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Generate a presigned URL for uploading a file
 * @param fileName - Original file name
 * @param contentType - The content type of the file
 * @param expiresIn - Time in seconds until the URL expires (default: 5 minutes)
 * @returns Promise with the presigned URL for uploading and the file key
 */
export async function getUploadPresignedUrl(
	fileName: string,
	contentType: string,
	expiresIn = 300, // 5 minutes default
): Promise<{ url: string; key: string }> {
	try {
		// Generate a unique key for the file
		const key = `uploads/${Date.now()}-${fileName}`;

		const command = new PutObjectCommand({
			Bucket: s3Config.bucket,
			Key: key,
			ContentType: contentType,
		});

		const url = await getSignedUrl(s3Client, command, { expiresIn });

		return {
			url,
			key,
		};
	} catch (error) {
		logger.error(`Error generating upload URL for ${fileName}:`, error);
		throw new Error(
			`Failed to generate upload URL: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * 上传文件并返回持久访问链接
 * 上传后自动生成7天有效的访问链接
 *
 * @param key - 文件路径/名称
 * @param data - 文件内容
 * @param contentType - 内容类型
 * @returns 包含上传结果和访问链接的Promise
 */
export async function uploadFileAndGetLink(
	key: string,
	data: string | Uint8Array | ArrayBuffer | Blob | Response | Request,
	contentType?: string,
): Promise<{ bytesWritten: number; fileUrl: string }> {
	try {
		// 上传文件
		const bytesWritten = await uploadFile(key, data, contentType);

		// 生成7天访问链接
		const fileUrl = await getLongLivedPresignedUrl(key);

		return {
			bytesWritten,
			fileUrl,
		};
	} catch (error) {
		logger.error(`Error in uploadFileAndGetLink for ${key}:`, error);
		throw new Error(
			`Failed to upload file and generate link: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Get stats for a file in S3
 * @param key - The file path/name in S3
 * @returns Promise with file stats
 */
export async function getFileStats(key: string) {
	const command = new HeadObjectCommand({
		Bucket: s3Config.bucket,
		Key: key,
	});

	try {
		const response = await s3Client.send(command);
		return {
			size: response.ContentLength,
			lastModified: response.LastModified,
			contentType: response.ContentType,
			eTag: response.ETag,
		};
	} catch (error) {
		logger.error(`Error getting stats for file ${key}:`, error);
		throw new Error(
			`Failed to get file stats: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

export { s3Client };
