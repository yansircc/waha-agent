import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

import {
	ONE_WEEK_IN_SECONDS,
	deleteFile,
	fileExists,
	getFile,
	getLongLivedPresignedUrl,
	getPresignedUrl,
	getUploadPresignedUrl,
	uploadFile,
	uploadFileAndGetLink,
} from "@/lib/s3-service";

/**
 * S3/Cloudflare R2 操作的 tRPC 路由
 * 提供上传、下载、删除和检查文件的能力
 */
export const s3Router = createTRPCRouter({
	/**
	 * 检查文件是否存在
	 */
	fileExists: protectedProcedure
		.input(
			z.object({
				bucket: z.string().optional(),
				key: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await fileExists(input.key);
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to check if file exists",
					cause: error,
				});
			}
		}),

	/**
	 * 获取文件内容
	 */
	getFile: protectedProcedure
		.input(
			z.object({
				bucket: z.string().optional(),
				key: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const content = await getFile(input.key, "text");
				return {
					content,
					contentType: "text/plain",
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to retrieve file",
					cause: error,
				});
			}
		}),

	/**
	 * 获取预签名URL，用于直接访问文件
	 */
	getPresignedUrl: protectedProcedure
		.input(
			z.object({
				bucket: z.string().optional(),
				key: z.string(),
				expiresIn: z.number().default(3600),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return getPresignedUrl(input.key, input.expiresIn);
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to generate presigned URL",
					cause: error,
				});
			}
		}),

	/**
	 * 获取长期预签名URL (7天)，用于分享文件
	 */
	getLongLivedUrl: protectedProcedure
		.input(
			z.object({
				bucket: z.string().optional(),
				key: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return getLongLivedPresignedUrl(input.key);
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to generate long-lived URL",
					cause: error,
				});
			}
		}),

	/**
	 * 删除文件
	 */
	deleteFile: protectedProcedure
		.input(
			z.object({
				bucket: z.string().optional(),
				key: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				await deleteFile(input.key);
				return { success: true };
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to delete file",
					cause: error,
				});
			}
		}),

	/**
	 * 上传文件 - 文本内容
	 */
	uploadText: protectedProcedure
		.input(
			z.object({
				bucket: z.string().optional(),
				key: z.string(),
				content: z.string(),
				contentType: z.string().optional(),
				maxSizeBytes: z.number().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const contentBytes = Buffer.from(input.content, "utf-8");

				if (input.maxSizeBytes && contentBytes.length > input.maxSizeBytes) {
					throw new TRPCError({
						code: "PAYLOAD_TOO_LARGE",
						message: `Content exceeds maximum size of ${input.maxSizeBytes / 1024 / 1024}MB`,
					});
				}

				const bytesWritten = await uploadFile(
					input.key,
					input.content,
					input.contentType || "text/plain",
				);

				return {
					success: true,
					bytesWritten,
				};
			} catch (error) {
				if (error instanceof TRPCError) throw error;

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to upload text content",
					cause: error,
				});
			}
		}),

	/**
	 * 上传文件并生成长期访问链接
	 * 适合上传后需要立即获得7天有效链接的场景
	 */
	uploadWithLongLivedUrl: protectedProcedure
		.input(
			z.object({
				bucket: z.string().optional(),
				key: z.string(),
				content: z.string(),
				contentType: z.string().optional(),
				maxSizeBytes: z.number().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const contentBytes = Buffer.from(input.content, "utf-8");

				if (input.maxSizeBytes && contentBytes.length > input.maxSizeBytes) {
					throw new TRPCError({
						code: "PAYLOAD_TOO_LARGE",
						message: `Content exceeds maximum size of ${input.maxSizeBytes / 1024 / 1024}MB`,
					});
				}

				const result = await uploadFileAndGetLink(
					input.key,
					input.content,
					input.contentType || "text/plain",
				);

				return {
					success: true,
					bytesWritten: result.bytesWritten,
					fileUrl: result.fileUrl,
					expiresAt: new Date(
						Date.now() + ONE_WEEK_IN_SECONDS * 1000,
					).toISOString(),
				};
			} catch (error) {
				if (error instanceof TRPCError) throw error;

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to upload and generate link",
					cause: error,
				});
			}
		}),

	/**
	 * 上传文件 - 二进制内容
	 * 注意：这个端点仅用于小型二进制内容，大文件应通过专门的上传API端点处理
	 */
	uploadBinary: protectedProcedure
		.input(
			z.object({
				bucket: z.string().optional(),
				key: z.string(),
				base64: z.string(),
				contentType: z.string().optional(),
				maxSizeBytes: z.number().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const buffer = Buffer.from(input.base64, "base64");

				if (input.maxSizeBytes && buffer.length > input.maxSizeBytes) {
					throw new TRPCError({
						code: "PAYLOAD_TOO_LARGE",
						message: `Content exceeds maximum size of ${input.maxSizeBytes / 1024 / 1024}MB`,
					});
				}

				const bytesWritten = await uploadFile(
					input.key,
					buffer,
					input.contentType || "application/octet-stream",
				);

				return {
					success: true,
					bytesWritten,
				};
			} catch (error) {
				if (error instanceof TRPCError) throw error;

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to upload binary content",
					cause: error,
				});
			}
		}),

	/**
	 * 上传二进制内容并生成长期访问链接
	 */
	uploadBinaryWithLongLivedUrl: protectedProcedure
		.input(
			z.object({
				bucket: z.string().optional(),
				key: z.string(),
				base64: z.string(),
				contentType: z.string().optional(),
				maxSizeBytes: z.number().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const buffer = Buffer.from(input.base64, "base64");

				if (input.maxSizeBytes && buffer.length > input.maxSizeBytes) {
					throw new TRPCError({
						code: "PAYLOAD_TOO_LARGE",
						message: `Content exceeds maximum size of ${input.maxSizeBytes / 1024 / 1024}MB`,
					});
				}

				const result = await uploadFileAndGetLink(
					input.key,
					buffer,
					input.contentType || "application/octet-stream",
				);

				return {
					success: true,
					bytesWritten: result.bytesWritten,
					fileUrl: result.fileUrl,
					expiresAt: new Date(
						Date.now() + ONE_WEEK_IN_SECONDS * 1000,
					).toISOString(),
				};
			} catch (error) {
				if (error instanceof TRPCError) throw error;

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to upload binary and generate link",
					cause: error,
				});
			}
		}),

	/**
	 * 创建用户存储桶路径
	 * 注意：这只是生成路径，S3不需要实际创建"文件夹"
	 */
	createUserBucket: protectedProcedure
		.input(
			z.object({
				bucket: z.string().optional(),
				userId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// 创建一个标记文件来表示桶初始化
				const bytesWritten = await uploadFile(
					`${input.userId}/.initialized`,
					"Bucket initialized",
					"text/plain",
				);

				return {
					success: true,
					path: input.userId,
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to initialize user bucket",
					cause: error,
				});
			}
		}),

	/**
	 * 获取上传文件的预签名URL
	 */
	getUploadUrl: protectedProcedure
		.input(
			z.object({
				fileName: z.string(),
				fileType: z.string(),
				expiresIn: z.number().default(300), // 5 minutes default
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await getUploadPresignedUrl(
					input.fileName,
					input.fileType,
					input.expiresIn,
				);
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to generate upload URL",
					cause: error,
				});
			}
		}),
});
