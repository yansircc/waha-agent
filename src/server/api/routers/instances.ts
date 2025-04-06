import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { instances } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const instancesRouter = createTRPCRouter({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const result = await ctx.db.query.instances.findMany({
			where: (instance, { eq }) =>
				eq(instance.createdById, ctx.session.user.id),
			orderBy: (instance, { desc }) => [desc(instance.createdAt)],
			with: {
				agent: true,
			},
		});
		return result;
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.db.query.instances.findFirst({
				where: (instance, { eq, and }) =>
					and(
						eq(instance.id, input.id),
						eq(instance.createdById, ctx.session.user.id),
					),
				with: {
					agent: true,
				},
			});
			return result;
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(255),
				phoneNumber: z.string().optional(),
				agentId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const result = await ctx.db
				.insert(instances)
				.values({
					name: input.name,
					phoneNumber: input.phoneNumber || "",
					agentId: input.agentId,
					status: "disconnected",
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
				phoneNumber: z.string().optional(),
				agentId: z.string().optional(),
				status: z.enum(["connected", "disconnected", "connecting"]).optional(),
				qrCode: z.string().optional(),
				sessionData: z.record(z.any()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// First make sure the instance belongs to the user
			const instance = await ctx.db.query.instances.findFirst({
				where: (instance, { eq, and }) =>
					and(
						eq(instance.id, input.id),
						eq(instance.createdById, ctx.session.user.id),
					),
			});

			if (!instance) {
				throw new Error(
					"Instance not found or you don't have permission to update it",
				);
			}

			const updateData: Record<string, unknown> = {};
			if (input.name !== undefined) updateData.name = input.name;
			if (input.phoneNumber !== undefined)
				updateData.phoneNumber = input.phoneNumber;
			if (input.agentId !== undefined) updateData.agentId = input.agentId;
			if (input.status !== undefined) updateData.status = input.status;
			if (input.qrCode !== undefined) updateData.qrCode = input.qrCode;
			if (input.sessionData !== undefined)
				updateData.sessionData = input.sessionData;

			const result = await ctx.db
				.update(instances)
				.set(updateData)
				.where(eq(instances.id, input.id))
				.returning();

			return result[0];
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// First make sure the instance belongs to the user
			const instance = await ctx.db.query.instances.findFirst({
				where: (instance, { eq, and }) =>
					and(
						eq(instance.id, input.id),
						eq(instance.createdById, ctx.session.user.id),
					),
			});

			if (!instance) {
				throw new Error(
					"Instance not found or you don't have permission to delete it",
				);
			}

			await ctx.db.delete(instances).where(eq(instances.id, input.id));
			return { success: true };
		}),
});
