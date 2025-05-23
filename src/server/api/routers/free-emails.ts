import { z } from "zod";

import { freeEmailFormSchema } from "@/app/free-emails/types";
import { freeEmails } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const freeEmailsRouter = createTRPCRouter({
	// Get all free email configurations for the current user
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const userFreeEmails = await ctx.db.query.freeEmails.findMany({
			where: eq(freeEmails.createdById, ctx.session.user.id),
			with: {
				agent: true,
			},
		});

		return userFreeEmails;
	}),

	// Create a new free email configuration
	create: protectedProcedure
		.input(freeEmailFormSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check if an email with same address already exists
			const existingEmail = await ctx.db.query.freeEmails.findFirst({
				where: eq(freeEmails.email, input.email),
			});

			if (existingEmail) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "An email configuration with this address already exists",
				});
			}

			// Check if alias already exists
			const existingAlias = await ctx.db.query.freeEmails.findFirst({
				where: eq(freeEmails.alias, input.alias),
			});

			if (existingAlias) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "This alias is already in use",
				});
			}

			// Insert new free email configuration
			const [newFreeEmail] = await ctx.db
				.insert(freeEmails)
				.values({
					email: input.email,
					alias: input.alias,
					plunkApiKey: input.plunkApiKey,
					agentId: input.agentId,
					wechatPushApiKey: input.wechatPushApiKey || null,
					ccEmails: input.ccEmails || null,
					redirectUrl: input.redirectUrl || null,
					disableCaptcha: input.disableCaptcha,
					enableFileUpload: input.enableFileUpload,
					customWebhooks: input.customWebhooks || null,
					createdById: userId,
				})
				.returning();

			return newFreeEmail;
		}),

	// Update an existing free email configuration
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				data: freeEmailFormSchema.partial(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Ensure the email configuration belongs to the current user
			const existingEmail = await ctx.db.query.freeEmails.findFirst({
				where: and(
					eq(freeEmails.id, input.id),
					eq(freeEmails.createdById, userId),
				),
			});

			if (!existingEmail) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Email configuration not found or not owned by you",
				});
			}

			// Check if alias is being updated and if it conflicts
			if (input.data.alias && input.data.alias !== existingEmail.alias) {
				const existingAlias = await ctx.db.query.freeEmails.findFirst({
					where: eq(freeEmails.alias, input.data.alias),
				});

				if (existingAlias) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "This alias is already in use",
					});
				}
			}

			// Update the email configuration
			const [updatedEmail] = await ctx.db
				.update(freeEmails)
				.set({
					...input.data,
					wechatPushApiKey: input.data.wechatPushApiKey || null,
					ccEmails: input.data.ccEmails || null,
					redirectUrl: input.data.redirectUrl || null,
					customWebhooks: input.data.customWebhooks || null,
					updatedAt: new Date(),
				})
				.where(
					and(eq(freeEmails.id, input.id), eq(freeEmails.createdById, userId)),
				)
				.returning();

			return updatedEmail;
		}),

	// Delete a free email configuration
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Ensure the email configuration belongs to the current user
			const existingEmail = await ctx.db.query.freeEmails.findFirst({
				where: and(
					eq(freeEmails.id, input.id),
					eq(freeEmails.createdById, userId),
				),
			});

			if (!existingEmail) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Email configuration not found or not owned by you",
				});
			}

			// Delete the email configuration
			await ctx.db
				.delete(freeEmails)
				.where(
					and(eq(freeEmails.id, input.id), eq(freeEmails.createdById, userId)),
				);

			return { success: true };
		}),
});
