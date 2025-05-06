import { env } from "@/env";
import { kbPreprocessor } from "@/lib/ai-agents/kb-preprocessor";
import { getRecentDocumentUpdates } from "@/lib/document-updates";
import { convertToMarkdown } from "@/lib/markitdown";
import { deleteFile, uploadFileAndGetLink } from "@/lib/s3-service";
import { documents } from "@/server/db/schema";
import { vectorizeDocument } from "@/trigger/vectorize-document";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

/**
 * 文档相关的tRPC路由
 */
export const documentsRouter = createTRPCRouter({
	/**
	 * 获取文档状态更新
	 * 用于前端轮询检查文档的向量化状态变化
	 */
	getDocumentUpdates: protectedProcedure
		.input(
			z.object({
				documentIds: z.array(z.string()),
				since: z.number().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { documentIds, since = 0 } = input;

			if (!documentIds.length) {
				return {
					success: true,
					updates: [],
					timestamp: Date.now(),
				};
			}

			try {
				// 首先检查内存中的最近更新
				const recentUpdates = getRecentDocumentUpdates().filter((update) =>
					documentIds.includes(update.documentId),
				);

				// 如果所有请求的文档都有最近的更新，直接返回
				if (recentUpdates.length === documentIds.length) {
					return {
						success: true,
						updates: recentUpdates,
						timestamp: Date.now(),
					};
				}

				// 对于没有最近更新的文档，从数据库获取
				const documentsToFetch = documentIds.filter(
					(id) => !recentUpdates.some((update) => update.documentId === id),
				);

				if (documentsToFetch.length > 0) {
					const dbDocuments = await ctx.db.query.documents.findMany({
						where: inArray(documents.id, documentsToFetch),
						columns: {
							id: true,
							kbId: true,
							vectorizationStatus: true,
							updatedAt: true,
						},
					});

					// 将数据库文档格式化为更新
					const dbUpdates = dbDocuments.map((doc) => ({
						documentId: doc.id,
						kbId: doc.kbId,
						status: doc.vectorizationStatus || "pending",
						timestamp: doc.updatedAt?.getTime() || Date.now(),
					}));

					// 合并内存和数据库更新
					const allUpdates = [...recentUpdates, ...dbUpdates];

					return {
						success: true,
						updates: allUpdates,
						timestamp: Date.now(),
					};
				}

				return {
					success: true,
					updates: recentUpdates,
					timestamp: Date.now(),
				};
			} catch (error) {
				console.error("Error fetching document updates:", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch document updates",
					cause: error,
				});
			}
		}),

	/**
	 * Convert an uploaded document to Markdown format
	 */
	convertToMarkdown: protectedProcedure
		.input(
			z.object({
				documentId: z.string(),
				originalUrl: z.string().url(),
				deleteOriginal: z.boolean().default(true),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			try {
				// 1. Fetch the document from database
				const document = await ctx.db.query.documents.findFirst({
					where: (docs, { eq }) => eq(docs.id, input.documentId),
				});

				if (!document) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Document not found",
					});
				}

				// 2. Convert the document to Markdown
				const markdownContent = await convertToMarkdown(input.originalUrl);

				// use ai-agents/kb-preprocessor to preprocess the markdown content
				const preprocessedContent = await kbPreprocessor(
					env.AI_HUB_MIX_API_KEY,
					markdownContent,
				);

				// 3. Generate a unique S3 key for the markdown document
				const s3Key = `documents/${document.kbId}/${document.id}.md`;

				// 4. Upload markdown content to S3 and get URL
				const uploadResult = await uploadFileAndGetLink(
					s3Key,
					preprocessedContent,
					"text/markdown; charset=utf-8",
				);

				// 5. Update document in database with the markdown URL
				await ctx.db
					.update(documents)
					.set({
						fileUrl: uploadResult.fileUrl,
						fileType: "text/markdown",
						content: preprocessedContent, // Store the markdown content for fallback
						updatedAt: new Date(),
					})
					.where(eq(documents.id, input.documentId))
					.execute();

				// 6. Optionally delete the original file if requested
				if (input.deleteOriginal && document.filePath) {
					try {
						// 添加一个延迟，确保Markdown文件完全上传好并可访问
						await new Promise((resolve) => setTimeout(resolve, 1000));
						console.log(`[DOC-ROUTER] 开始删除原始文件: ${document.filePath}`);
						await deleteFile(document.filePath);
						console.log(`[DOC-ROUTER] 原始文件删除成功: ${document.filePath}`);
					} catch (deleteError) {
						console.error("[DOC-ROUTER] 删除原始文件失败:", deleteError);
						// Don't throw error here, just log it - the conversion was successful
					}
				}

				return {
					success: true,
					fileUrl: uploadResult.fileUrl,
					documentId: document.id,
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error
							? error.message
							: "Failed to convert document to Markdown",
					cause: error,
				});
			}
		}),

	/**
	 * 批量更新现有文档，将其转换为Markdown并更新fileUrl
	 */
	batchConvertDocumentsToMarkdown: protectedProcedure
		.input(
			z.object({
				kbId: z.string().optional(), // Optional: convert only documents in a specific KB
				limit: z.number().min(1).max(100).default(10), // Process in batches for safety
			}),
		)
		.mutation(async ({ input, ctx }) => {
			try {
				// 1. Find documents that need conversion (those with non-markdown fileType)
				const query = ctx.db.query.documents.findMany({
					where: (docs, { ne, eq, and }) =>
						and(
							ne(docs.fileType, "text/markdown"),
							input.kbId ? eq(docs.kbId, input.kbId) : undefined,
						),
					limit: input.limit,
				});

				const docsToConvert = await query;

				if (docsToConvert.length === 0) {
					return {
						success: true,
						message: "No documents requiring conversion found",
						convertedCount: 0,
					};
				}

				// 2. Process each document
				const results = [];
				for (const doc of docsToConvert) {
					if (!doc.fileUrl) {
						results.push({
							id: doc.id,
							success: false,
							error: "Missing fileUrl",
						});
						continue;
					}

					try {
						// Convert document to Markdown
						const markdownContent = await convertToMarkdown(doc.fileUrl);

						// Generate S3 key and upload
						const s3Key = `documents/${doc.kbId}/${doc.id}.md`;
						const uploadResult = await uploadFileAndGetLink(
							s3Key,
							markdownContent,
							"text/markdown; charset=utf-8",
						);

						// Update the document
						await ctx.db
							.update(documents)
							.set({
								fileUrl: uploadResult.fileUrl,
								fileType: "text/markdown",
								content: markdownContent,
								updatedAt: new Date(),
							})
							.where(eq(documents.id, doc.id))
							.execute();

						results.push({
							id: doc.id,
							success: true,
							newFileUrl: uploadResult.fileUrl,
						});

						// Optionally delete original file if we have filePath
						if (doc.filePath) {
							try {
								await deleteFile(doc.filePath);
							} catch (deleteError) {
								console.error(
									`Failed to delete original file for ${doc.id}:`,
									deleteError,
								);
							}
						}
					} catch (error) {
						results.push({
							id: doc.id,
							success: false,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}

				return {
					success: true,
					message: `Processed ${docsToConvert.length} documents`,
					convertedCount: results.filter((r) => r.success).length,
					failedCount: results.filter((r) => !r.success).length,
					results,
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error
							? error.message
							: "Failed to batch convert documents",
					cause: error,
				});
			}
		}),

	/**
	 * 触发文档向量化任务
	 */
	triggerDocumentVectorization: protectedProcedure
		.input(
			z.object({
				documentId: z.string(),
				kbId: z.string(),
				url: z.string().url(),
				collectionName: z.string(),
				userId: z.string().default("admin"),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// 触发文档向量化任务
				const handle = await vectorizeDocument.trigger({
					documentId: input.documentId,
					kbId: input.kbId,
					url: input.url,
					collectionName: input.collectionName,
					userId: input.userId,
				});

				// 创建一个特定于此运行的公共访问令牌
				const publicAccessToken = await triggerAuth.createPublicToken({
					scopes: {
						read: {
							runs: [handle.id],
						},
					},
				});

				return {
					success: true,
					handle,
					token: publicAccessToken,
				};
			} catch (error) {
				console.error("[tRPC] Error triggering document vectorization:", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to trigger document vectorization",
					cause: error,
				});
			}
		}),
});
