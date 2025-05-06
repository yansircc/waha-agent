import { env } from "@/env";
import { queueSessionStart } from "@/lib/session-queue";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type {
	SessionConfig,
	SessionCreateRequest,
	SessionLogoutRequest,
	SessionStopRequest,
	WebhookConfig,
} from "@/types/api-requests";
import { SessionInfoSchema } from "@/types/schemas";
import { z } from "zod";
import { wahaApi } from "./waha-api";

export const wahaSessionsRouter = createTRPCRouter({
	// List all sessions
	list: protectedProcedure
		.input(
			z
				.object({
					all: z.boolean().optional().default(false),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			try {
				const sessions = await wahaApi.sessions.listSessions(
					input?.all ?? false,
				);
				// More lenient parsing with safeParse
				const parsed = z.array(SessionInfoSchema).safeParse(sessions);

				if (!parsed.success) {
					console.error("Session schema validation error:", parsed.error);
					// Return an empty array if validation fails
					return [];
				}
				return parsed.data;
			} catch (error) {
				console.error("Failed to list sessions:", error);
				return [];
			}
		}),

	// Create a session
	create: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				start: z.boolean().optional().default(true),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			try {
				// Use instanceId as session name
				const sessionName = input.instanceId;

				// Create webhook URL for the instance
				const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp/${input.instanceId}`;

				// Create webhook config
				const webhook: WebhookConfig = {
					url: webhookUrl,
					events: ["message.any", "session.status"],
					hmac: null,
					retries: null,
					customHeaders: null,
				};

				const sessionConfig: SessionConfig = {
					debug: false,
					webhooks: [webhook],
					metadata: { instanceId: input.instanceId },
				};

				// Create session request
				const sessionRequest: SessionCreateRequest = {
					name: sessionName,
					start: input.start,
					config: sessionConfig,
				};

				return await wahaApi.sessions.createSession(sessionRequest);
			} catch (error) {
				throw new Error(
					`Failed to create session: ${(error as Error).message}`,
				);
			}
		}),

	// Get session information
	get: protectedProcedure
		.input(z.object({ instanceId: z.string() }))
		.query(async ({ input }) => {
			try {
				const session = await wahaApi.sessions.getSession(input.instanceId);
				// Handle potential schema mismatches
				const parsed = SessionInfoSchema.safeParse(session);
				if (!parsed.success) {
					console.error("Session schema validation error:", parsed.error);
					return null;
				}
				return parsed.data;
			} catch (error) {
				console.error(`Failed to get session: ${(error as Error).message}`);
				return null;
			}
		}),

	// Update a session
	update: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				data: z.object({
					config: z.record(z.unknown()).optional(),
				}),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await wahaApi.sessions.updateSession(
					input.instanceId,
					input.data,
				);
			} catch (error) {
				throw new Error(
					`Failed to update session: ${(error as Error).message}`,
				);
			}
		}),

	// Delete the session
	delete: protectedProcedure
		.input(z.object({ instanceId: z.string() }))
		.mutation(async ({ input }) => {
			try {
				await wahaApi.sessions.deleteSession(input.instanceId);
				return { success: true };
			} catch (error) {
				throw new Error(
					`Failed to delete session: ${(error as Error).message}`,
				);
			}
		}),

	// Get information about the authenticated account
	getMe: protectedProcedure
		.input(z.object({ instanceId: z.string() }))
		.query(async ({ input }) => {
			try {
				const meInfo = await wahaApi.sessions.getMeInfo(input.instanceId);
				return meInfo;
			} catch (error) {
				throw new Error(
					`Failed to get account info: ${(error as Error).message}`,
				);
			}
		}),

	// Start the session (now using the queue system)
	start: protectedProcedure
		.input(z.object({ instanceId: z.string() }))
		.mutation(async ({ input }) => {
			try {
				// Add to the queue
				const queueResult = await queueSessionStart(
					input.instanceId,
					input.instanceId,
				);

				return {
					success: true,
					message: `Session queued for starting at position ${queueResult.position}`,
					queuePosition: queueResult.position,
				};
			} catch (error) {
				throw new Error(
					`Failed to queue session start: ${(error as Error).message}`,
				);
			}
		}),

	// Get queue status
	getQueueStatus: protectedProcedure.query(async () => {
		try {
			// Import only when needed to avoid circular dependencies
			const { getQueueStatus } = await import("@/lib/session-queue");
			return await getQueueStatus();
		} catch (error) {
			console.error("Failed to get queue status:", error);
			return { waiting: 0, processing: 0 };
		}
	}),

	// Clear the queue (admin only)
	clearQueue: protectedProcedure.mutation(async () => {
		try {
			// Import only when needed to avoid circular dependencies
			const { clearQueue } = await import("@/lib/session-queue");
			await clearQueue();
			return { success: true };
		} catch (error) {
			throw new Error(`Failed to clear queue: ${(error as Error).message}`);
		}
	}),

	// Stop the session
	stop: protectedProcedure
		.input(z.object({ instanceId: z.string() }))
		.mutation(async ({ input }) => {
			try {
				return await wahaApi.sessions.stopSession(input.instanceId);
			} catch (error) {
				throw new Error(`Failed to stop session: ${(error as Error).message}`);
			}
		}),

	// Logout from the session
	logout: protectedProcedure
		.input(z.object({ instanceId: z.string() }))
		.mutation(async ({ input }) => {
			try {
				return await wahaApi.sessions.logoutSession(input.instanceId);
			} catch (error) {
				throw new Error(`Failed to logout: ${(error as Error).message}`);
			}
		}),

	// Restart the session
	restart: protectedProcedure
		.input(z.object({ instanceId: z.string() }))
		.mutation(async ({ input }) => {
			try {
				return await wahaApi.sessions.restartSession(input.instanceId);
			} catch (error) {
				throw new Error(
					`Failed to restart session: ${(error as Error).message}`,
				);
			}
		}),

	// Deprecated endpoints - Keeping them for backward compatibility
	legacyStart: protectedProcedure
		.input(
			z.object({
				name: z.string().optional().default("default"),
				config: z.record(z.unknown()).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// Use queue system for legacy start as well
				const { queueSessionStart } = await import("@/lib/session-queue");
				const queueResult = await queueSessionStart(input.name);

				return {
					success: true,
					message: `Session queued for starting at position ${queueResult.position}`,
					queuePosition: queueResult.position,
				};
			} catch (error) {
				throw new Error(`Failed to start session: ${(error as Error).message}`);
			}
		}),

	legacyStop: protectedProcedure
		.input(
			z.object({
				name: z.string().optional().default("default"),
				logout: z.boolean().optional().default(true),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const request: SessionStopRequest = {
					session: input.name,
				};
				await wahaApi.sessions.legacyStopSession(request);
				return { success: true };
			} catch (error) {
				throw new Error(`Failed to stop session: ${(error as Error).message}`);
			}
		}),

	legacyLogout: protectedProcedure
		.input(
			z.object({
				name: z.string().optional().default("default"),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const request: SessionLogoutRequest = {
					session: input.name,
				};
				await wahaApi.sessions.legacyLogoutSession(request);
				return { success: true };
			} catch (error) {
				throw new Error(
					`Failed to logout session: ${(error as Error).message}`,
				);
			}
		}),
});
