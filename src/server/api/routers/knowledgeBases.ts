import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { knowledgeBases } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const knowledgeBasesRouter = createTRPCRouter({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const result = await ctx.db.query.knowledgeBases.findMany({
			where: (kb, { eq }) => eq(kb.createdById, ctx.session.user.id),
			orderBy: (kb, { desc }) => [desc(kb.createdAt)],
		});
		return result;
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.db.query.knowledgeBases.findFirst({
				where: (kb, { eq, and }) =>
					and(eq(kb.id, input.id), eq(kb.createdById, ctx.session.user.id)),
			});
			return result;
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(255),
				description: z.string().optional(),
				content: z.string(),
				fileUrl: z.string().optional(),
				fileType: z.string().optional(),
				metadata: z.record(z.any()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const result = await ctx.db
				.insert(knowledgeBases)
				.values({
					name: input.name,
					description: input.description || "",
					content: input.content,
					fileUrl: input.fileUrl,
					fileType: input.fileType,
					metadata: input.metadata || {},
					createdById: ctx.session.user.id,
				})
				.returning();

			return result[0];
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(255).optional(),
				description: z.string().optional(),
				content: z.string().optional(),
				fileUrl: z.string().optional(),
				fileType: z.string().optional(),
				metadata: z.record(z.any()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// First make sure the knowledge base belongs to the user
			const kb = await ctx.db.query.knowledgeBases.findFirst({
				where: (kb, { eq, and }) =>
					and(eq(kb.id, input.id), eq(kb.createdById, ctx.session.user.id)),
			});

			if (!kb) {
				throw new Error(
					"Knowledge base not found or you don't have permission to update it",
				);
			}

			const updateData: Record<string, unknown> = {};
			if (input.name !== undefined) updateData.name = input.name;
			if (input.description !== undefined)
				updateData.description = input.description;
			if (input.content !== undefined) updateData.content = input.content;
			if (input.fileUrl !== undefined) updateData.fileUrl = input.fileUrl;
			if (input.fileType !== undefined) updateData.fileType = input.fileType;
			if (input.metadata !== undefined) updateData.metadata = input.metadata;

			const result = await ctx.db
				.update(knowledgeBases)
				.set(updateData)
				.where(eq(knowledgeBases.id, input.id))
				.returning();

			return result[0];
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// First make sure the knowledge base belongs to the user
			const kb = await ctx.db.query.knowledgeBases.findFirst({
				where: (kb, { eq, and }) =>
					and(eq(kb.id, input.id), eq(kb.createdById, ctx.session.user.id)),
			});

			if (!kb) {
				throw new Error(
					"Knowledge base not found or you don't have permission to delete it",
				);
			}

			await ctx.db
				.delete(knowledgeBases)
				.where(eq(knowledgeBases.id, input.id));
			return { success: true };
		}),
});
