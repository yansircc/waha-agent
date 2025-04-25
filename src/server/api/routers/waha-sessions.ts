import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type {
	SessionConfig,
	SessionCreateRequest,
	SessionLogoutRequest,
	SessionStartRequest,
	SessionStopRequest,
	WebhookConfig,
} from "@/types/api-requests";
import { SessionConfigSchema, SessionInfoSchema } from "@/types/schemas";
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
				name: z.string().optional().default("default"),
				config: SessionConfigSchema.optional(),
				start: z.boolean().optional().default(true),
				instanceId: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			try {
				// 创建一个会话配置对象
				let sessionConfig: SessionConfig | undefined;

				// 如果用户提供了配置，转换并使用它
				if (input.config) {
					sessionConfig = {
						debug: input.config.debug,
						proxy: input.config.proxy,
						metadata: input.config.metadata,
						noweb: input.config.noweb,
						webhooks: input.config.webhooks as WebhookConfig[] | undefined,
					};
				} else if (input.instanceId) {
					// 如果没有配置但有userId，创建带有默认webhook的配置
					const instanceId = input.instanceId;
					const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp/${instanceId}`;

					// 创建符合WebhookConfig接口的对象
					const webhook: WebhookConfig = {
						url: webhookUrl,
						events: ["message", "session.status"],
						hmac: null,
						retries: null,
						customHeaders: null,
					};

					sessionConfig = {
						debug: false,
						webhooks: [webhook],
						metadata: { "instance.id": instanceId },
					};
				} else {
					// 最小配置
					sessionConfig = { debug: false };
				}

				// 使用配置创建会话请求
				const sessionRequest: SessionCreateRequest = {
					name: input.name,
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
		.input(z.object({ session: z.string().default("default") }))
		.query(async ({ input }) => {
			try {
				const session = await wahaApi.sessions.getSession(input.session);
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
				session: z.string().default("default"),
				data: z.object({
					config: z.record(z.unknown()).optional(),
				}),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await wahaApi.sessions.updateSession(input.session, input.data);
			} catch (error) {
				throw new Error(
					`Failed to update session: ${(error as Error).message}`,
				);
			}
		}),

	// Delete the session
	delete: protectedProcedure
		.input(z.object({ session: z.string().default("default") }))
		.mutation(async ({ input }) => {
			try {
				await wahaApi.sessions.deleteSession(input.session);
				return { success: true };
			} catch (error) {
				throw new Error(
					`Failed to delete session: ${(error as Error).message}`,
				);
			}
		}),

	// Get information about the authenticated account
	getMe: protectedProcedure
		.input(z.object({ session: z.string().default("default") }))
		.query(async ({ input }) => {
			try {
				const meInfo = await wahaApi.sessions.getMeInfo(input.session);
				return meInfo;
			} catch (error) {
				throw new Error(
					`Failed to get account info: ${(error as Error).message}`,
				);
			}
		}),

	// Start the session
	start: protectedProcedure
		.input(z.object({ session: z.string().default("default") }))
		.mutation(async ({ input }) => {
			try {
				return await wahaApi.sessions.startSession(input.session);
			} catch (error) {
				throw new Error(`Failed to start session: ${(error as Error).message}`);
			}
		}),

	// Stop the session
	stop: protectedProcedure
		.input(z.object({ session: z.string().default("default") }))
		.mutation(async ({ input }) => {
			try {
				return await wahaApi.sessions.stopSession(input.session);
			} catch (error) {
				throw new Error(`Failed to stop session: ${(error as Error).message}`);
			}
		}),

	// Logout from the session
	logout: protectedProcedure
		.input(z.object({ session: z.string().default("default") }))
		.mutation(async ({ input }) => {
			try {
				return await wahaApi.sessions.logoutSession(input.session);
			} catch (error) {
				throw new Error(`Failed to logout: ${(error as Error).message}`);
			}
		}),

	// Restart the session
	restart: protectedProcedure
		.input(z.object({ session: z.string().default("default") }))
		.mutation(async ({ input }) => {
			try {
				return await wahaApi.sessions.restartSession(input.session);
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
				const request: SessionStartRequest = {
					session: input.name,
				};
				return await wahaApi.sessions.legacyStartSession(request);
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
