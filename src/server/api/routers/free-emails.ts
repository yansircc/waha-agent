import { z } from "zod";

import { freeEmailFormSchema } from "@/app/free-emails/types";
import {
	parseJsonValueIfNeeded,
	redis,
	safeRedisOperation,
	stringifyValueIfNeeded,
} from "@/lib/redis";
import { freeEmails } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const FREE_EMAIL_FORM_PREFIX = "free_email_form:";
const FORM_EXPIRY = 60 * 60 * 24 * 7; // 7 days

export const freeEmailsRouter = createTRPCRouter({
	// Get all free email configurations for the current user
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const userFreeEmails = await ctx.db.query.freeEmails.findMany({
			where: eq(freeEmails.createdById, ctx.session.user.id),
		});

		return userFreeEmails;
	}),

	// Get form state from Redis
	getFormState: protectedProcedure.query(async ({ ctx }) => {
		try {
			const key = `${FREE_EMAIL_FORM_PREFIX}${ctx.session.user.id}`;
			const data = await safeRedisOperation(() => redis.get(key));

			if (!data) return null;

			// 使用安全的 JSON 解析函数，明确返回类型
			const parsedData = parseJsonValueIfNeeded(data);

			// 确保返回的是一个对象，否则返回 null
			if (
				parsedData &&
				typeof parsedData === "object" &&
				!Array.isArray(parsedData)
			) {
				return parsedData as Record<string, unknown>;
			}

			console.warn("Redis data was not in expected format:", data);
			return null;
		} catch (error) {
			console.error("Error getting form state from Redis:", error);
			// Return null instead of throwing to allow the UI to still function
			return null;
		}
	}),

	// Save form state to Redis
	saveFormState: protectedProcedure
		.input(
			z.object({
				formData: z.record(z.any()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				const userId = ctx.session.user.id;
				const key = `${FREE_EMAIL_FORM_PREFIX}${userId}`;

				// Get existing data first
				let existingData: Record<string, unknown> = {};
				try {
					const existingDataStr = await safeRedisOperation(() =>
						redis.get(key),
					);
					if (existingDataStr) {
						const parsed = parseJsonValueIfNeeded(existingDataStr);
						if (
							parsed &&
							typeof parsed === "object" &&
							!Array.isArray(parsed)
						) {
							existingData = parsed as Record<string, unknown>;
						}
					}
				} catch (err) {
					console.error("Error fetching existing data from Redis:", err);
					// Continue with empty existing data
				}

				// Merge with new data
				const mergedData = {
					...existingData,
					...input.formData,
				};

				// 使用安全的 JSON 序列化函数和Redis操作
				await safeRedisOperation(() =>
					redis.set(key, stringifyValueIfNeeded(mergedData), {
						ex: FORM_EXPIRY,
					}),
				);

				return mergedData;
			} catch (error) {
				console.error("Error saving form state to Redis:", error);
				// Instead of throwing, return the input data so the UI can still update
				// This allows the form to continue working even if Redis fails
				return input.formData;
			}
		}),

	// Clear form state from Redis
	clearFormState: protectedProcedure.mutation(async ({ ctx }) => {
		try {
			const key = `${FREE_EMAIL_FORM_PREFIX}${ctx.session.user.id}`;
			await safeRedisOperation(() => redis.del(key));
			return { success: true };
		} catch (error) {
			console.error("Error clearing form state from Redis:", error);
			// Return success anyway to allow the UI to continue
			return {
				success: false,
				error: "Redis operation failed, but UI can continue",
			};
		}
	}),

	// Create a new free email configuration
	create: protectedProcedure
		.input(freeEmailFormSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check if an email with same address already exists
			const existingEmail = await ctx.db.query.freeEmails.findFirst({
				where: eq(freeEmails.emailAddress, input.emailAddress),
			});

			if (existingEmail) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "An email configuration with this address already exists",
				});
			}

			// Insert new free email configuration
			const [newFreeEmail] = await ctx.db
				.insert(freeEmails)
				.values({
					emailAddress: input.emailAddress,
					alias: input.alias,
					plunkApiKey: input.plunkApiKey,
					wechatPushApiKey: input.wechatPushApiKey,
					formSubmitActivated: input.formSubmitActivated,
					setupCompleted: input.setupCompleted,
					createdById: userId,
				})
				.returning();

			// Clear the form state from Redis after successful creation
			try {
				const key = `${FREE_EMAIL_FORM_PREFIX}${userId}`;
				await safeRedisOperation(() => redis.del(key));
			} catch (err) {
				// Log but don't fail the operation
				console.error("Failed to clear Redis form state after creation:", err);
			}

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

			// Update the email configuration
			const [updatedEmail] = await ctx.db
				.update(freeEmails)
				.set({
					...input.data,
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
