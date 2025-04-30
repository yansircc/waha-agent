import { kbService } from "@/lib/kb-service";
import { convertToMarkdown } from "@/lib/markitdown";
import { deleteFile, uploadFileAndGetLink } from "@/lib/s3-service";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const kbsRouter = createTRPCRouter({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		return kbService.kbs.getByUserId(ctx.session.user.id);
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return kbService.kbs.getById(input.id, ctx.session.user.id);
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(255),
				description: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return kbService.kbs.create({
				name: input.name,
				description: input.description,
				userId: ctx.session.user.id,
			});
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(255).optional(),
				description: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return kbService.kbs.update({
				id: input.id,
				name: input.name,
				description: input.description,
				userId: ctx.session.user.id,
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return kbService.kbs.delete(input.id, ctx.session.user.id);
		}),

	// Document related procedures
	getDocuments: protectedProcedure
		.input(z.object({ kbId: z.string() }))
		.query(async ({ ctx, input }) => {
			return kbService.documents.getByKbId(input.kbId, ctx.session.user.id);
		}),

	getDocumentById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return kbService.documents.getById(input.id, ctx.session.user.id);
		}),

	createDocument: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(255),
				content: z.string().optional(),
				kbId: z.string(),
				fileUrl: z.string().optional(),
				filePath: z.string().optional(),
				fileType: z.string().optional(),
				fileSize: z.number().optional(),
				mimeType: z.string().optional(),
				metadata: z.record(z.any()).optional(),
				// Note: File uploads can't be directly handled by tRPC
				// We'll need a separate endpoint for file uploads
				preserveOriginal: z.boolean().default(false), // 控制是否保留原始文件
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// 创建文档前检查
			console.log("[KB-ROUTER] 创建文档开始:", {
				name: input.name,
				fileType: input.fileType,
				fileUrl: input.fileUrl,
			});

			// 如果提供了fileUrl，且不是Markdown文件，需要进行转换
			if (
				input.fileUrl &&
				input.fileType &&
				!input.fileType.includes("markdown") &&
				!input.fileType.includes("text/plain")
			) {
				try {
					console.log(
						`[KB-ROUTER] 检测到非Markdown文件，开始转换: ${input.fileUrl}`,
					);

					// 尝试获取Markdown内容
					const markdownContent = await convertToMarkdown(input.fileUrl);
					console.log(
						`[KB-ROUTER] Markdown转换成功，内容长度: ${markdownContent.length}`,
					);

					// 为Markdown文件生成唯一名称
					const timestamp = Date.now();
					const safeName = input.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
					const s3Key = `documents_markdown/${input.kbId}/${timestamp}-${safeName}.md`;

					// 上传Markdown到S3
					console.log("[KB-ROUTER] 上传Markdown到S3:", s3Key);
					const uploadResult = await uploadFileAndGetLink(
						s3Key,
						markdownContent,
						"text/markdown; charset=utf-8",
					);

					// 重写输入参数，直接使用Markdown版本
					input.content = markdownContent;
					input.fileUrl = uploadResult.fileUrl;
					input.fileType = "text/markdown";
					input.fileSize = Buffer.byteLength(markdownContent, "utf8");

					// 保存原始文件路径用于删除
					const originalFilePath = input.filePath;

					// 更新filePath为新的Markdown路径，确保链接正确
					input.filePath = s3Key;

					// 设置fileUrl防止它被重新生成
					input.fileUrl = uploadResult.fileUrl;

					// 删除原始PDF文件
					if (input.preserveOriginal !== true && originalFilePath) {
						try {
							// 延迟一秒确保新文件已完全上传
							await new Promise((resolve) => setTimeout(resolve, 1000));

							console.log("[KB-ROUTER] 删除原始文件:", originalFilePath);
							await deleteFile(originalFilePath);
							console.log("[KB-ROUTER] 原始文件删除成功");
						} catch (error) {
							console.error("[KB-ROUTER] 删除原始文件失败:", error);
						}
					}

					console.log(
						"[KB-ROUTER] 转换完成，使用Markdown版本创建文档:",
						uploadResult.fileUrl,
					);
				} catch (error) {
					console.error("[KB-ROUTER] Markdown转换失败:", error);
					// 转换失败时继续使用原始文件
				}
			}

			// 创建文档(使用修改后的input，可能是原始版本或Markdown版本)
			const document = await kbService.documents.create({
				...input,
				userId: ctx.session.user.id,
			});

			console.log("[KB-ROUTER] 文档创建成功:", {
				id: document.id,
				fileUrl: document.fileUrl,
				fileType: document.fileType,
			});

			return document;
		}),

	updateDocument: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(255).optional(),
				content: z.string().optional(),
				fileUrl: z.string().optional(),
				filePath: z.string().optional(),
				fileType: z.string().optional(),
				fileSize: z.number().optional(),
				mimeType: z.string().optional(),
				metadata: z.record(z.any()).optional(),
				kbId: z.string(),
				// Note: File uploads need a separate endpoint
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return kbService.documents.update({
				id: input.id,
				name: input.name,
				content: input.content,
				fileUrl: input.fileUrl,
				filePath: input.filePath,
				fileType: input.fileType,
				fileSize: input.fileSize,
				mimeType: input.mimeType,
				metadata: input.metadata,
				kbId: input.kbId,
				userId: ctx.session.user.id,
			});
		}),

	deleteDocument: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return kbService.documents.delete(input.id, ctx.session.user.id);
		}),

	// 更新文档向量化状态
	updateDocumentStatus: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				status: z.string(),
				errorMessage: z.string().optional(),
				kbId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return kbService.documents.update({
				id: input.id,
				vectorizationStatus: input.status,
				metadata: input.errorMessage
					? { vectorizationError: input.errorMessage }
					: undefined,
				userId: ctx.session.user.id,
				kbId: input.kbId,
			});
		}),
});
