import { kbService } from "@/lib/kb-service";
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
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return kbService.documents.create({
				name: input.name,
				content: input.content,
				kbId: input.kbId,
				fileUrl: input.fileUrl,
				filePath: input.filePath,
				fileType: input.fileType,
				fileSize: input.fileSize,
				mimeType: input.mimeType,
				metadata: input.metadata,
				userId: ctx.session.user.id,
			});
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
