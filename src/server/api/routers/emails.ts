import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { emailConfigs } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

// Schema for email config creation and updates
const emailConfigSchema = z.object({
	id: z.string().optional(),
	signature: z.string().optional().nullable(),
	plunkApiKey: z.string().min(1, "Plunk API key is required"),
	wechatPushApiKey: z.string().min(1, "Wechat push API key is required"),
	formDataFormId: z.string().min(1, "Form-Data form ID is required"),
	formDataWebhookSecret: z
		.string()
		.min(1, "Form-Data webhook secret is required"),
	agentId: z.string().min(1, "Agent ID is required"),
});

export const emailsRouter = createTRPCRouter({
	// Get all email configs for the current user
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const userEmails = await ctx.db.query.emailConfigs.findMany({
			where: eq(emailConfigs.createdById, ctx.session.user.id),
			with: {
				agent: true,
			},
			orderBy: (emails) => [emails.createdAt],
		});

		return userEmails;
	}),

	// Get a single email config by ID
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const emailConfig = await ctx.db.query.emailConfigs.findFirst({
				where: and(
					eq(emailConfigs.id, input.id),
					eq(emailConfigs.createdById, ctx.session.user.id),
				),
				with: {
					agent: true,
				},
			});

			if (!emailConfig) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Email configuration not found",
				});
			}

			return emailConfig;
		}),

	// Create a new email config
	create: protectedProcedure
		.input(emailConfigSchema)
		.mutation(async ({ ctx, input }) => {
			const newEmailConfig = await ctx.db.insert(emailConfigs).values({
				signature: input.signature,
				plunkApiKey: input.plunkApiKey,
				wechatPushApiKey: input.wechatPushApiKey,
				formDataFormId: input.formDataFormId,
				formDataWebhookSecret: input.formDataWebhookSecret,
				agentId: input.agentId,
				createdById: ctx.session.user.id,
			});

			return newEmailConfig;
		}),

	// Update an existing email config
	update: protectedProcedure
		.input(emailConfigSchema.extend({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Check if email config exists and belongs to the user
			const existingConfig = await ctx.db.query.emailConfigs.findFirst({
				where: and(
					eq(emailConfigs.id, input.id),
					eq(emailConfigs.createdById, ctx.session.user.id),
				),
			});

			if (!existingConfig) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Email configuration not found",
				});
			}

			// Update the email config
			await ctx.db
				.update(emailConfigs)
				.set({
					signature: input.signature,
					plunkApiKey: input.plunkApiKey,
					wechatPushApiKey: input.wechatPushApiKey,
					formDataFormId: input.formDataFormId,
					formDataWebhookSecret: input.formDataWebhookSecret,
					agentId: input.agentId,
				})
				.where(eq(emailConfigs.id, input.id));

			return { success: true };
		}),

	// Delete an email config
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Check if email config exists and belongs to the user
			const existingConfig = await ctx.db.query.emailConfigs.findFirst({
				where: and(
					eq(emailConfigs.id, input.id),
					eq(emailConfigs.createdById, ctx.session.user.id),
				),
			});

			if (!existingConfig) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Email configuration not found",
				});
			}

			// Delete the email config
			await ctx.db.delete(emailConfigs).where(eq(emailConfigs.id, input.id));

			return { success: true };
		}),
});
