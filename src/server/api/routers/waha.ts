import { env } from "@/env";
import { queueSessionStart } from "@/lib/session-queue";
import { createInstanceApiClient } from "@/lib/waha-api";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { SessionInfo } from "@/types";
import { SessionInfoSchema } from "@/types/schemas";
import {
	type SessionConfig,
	type AppSessionCreateRequest as SessionCreateRequest,
	type WebhookConfig,
	convertAppToApiSessionCreate,
} from "@/types/waha";
import { z } from "zod";

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
		.query(async ({ input, ctx }) => {
			try {
				// 首先获取所有实例及其自定义 API 端点
				const instances = await ctx.db.query.instances.findMany({
					where: (instance, { eq }) =>
						eq(instance.createdById, ctx.session.user.id),
				});

				// 创建一个 Map 来存储 API 端点和对应的 API 密钥
				const apiEndpointsWithKeys = new Map<string, string>();

				// 添加默认 API 端点和密钥
				apiEndpointsWithKeys.set(
					env.NEXT_PUBLIC_WAHA_API_URL,
					env.WHATSAPP_API_KEY,
				);

				// 添加所有自定义 API 端点和对应的密钥
				for (const instance of instances) {
					if (instance.userWahaApiEndpoint && instance.userWahaApiKey) {
						apiEndpointsWithKeys.set(
							instance.userWahaApiEndpoint,
							instance.userWahaApiKey,
						);
					}
				}

				// 对每个 API 端点查询会话
				let allSessions: SessionInfo[] = [];

				for (const [apiEndpoint, apiKey] of apiEndpointsWithKeys.entries()) {
					try {
						// 为每个 API 端点创建一个客户端，并传入对应的 API 密钥
						const apiClient = createInstanceApiClient(apiEndpoint, apiKey);

						// 查询此 API 端点的会话
						const endpointSessions = await apiClient.sessions.listSessions(
							input?.all ?? false,
						);

						// 添加到总会话列表
						if (Array.isArray(endpointSessions)) {
							// 添加 API 端点信息到每个会话
							const sessionsWithEndpoint = endpointSessions.map((session) => ({
								...session,
								apiEndpoint, // 添加 API 端点信息，这样前端可以知道会话属于哪个 API
							}));
							allSessions = allSessions.concat(sessionsWithEndpoint);
						}
					} catch (error) {
						console.error(
							`Failed to list sessions from API endpoint ${apiEndpoint}:`,
							error,
						);
						// 继续查询其他 API 端点，不终止整个流程
					}
				}

				// More lenient parsing with safeParse
				const parsed = z
					.array(
						SessionInfoSchema.extend({
							apiEndpoint: z.string().optional(),
						}),
					)
					.safeParse(allSessions);

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
				userWahaApiEndpoint: z.string().optional(),
				userWahaApiKey: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			try {
				// Use instanceId as session name
				const sessionName = input.instanceId;

				// 从数据库获取实例信息，包括 userWebhooks 和 userWahaApiEndpoint
				const instance = await ctx.db.query.instances.findFirst({
					where: (instance, { eq }) => eq(instance.id, input.instanceId),
				});

				// 创建实例特定的 API 客户端，使用自定义 API 端点和密钥（如果有）
				const instanceApi = createInstanceApiClient(
					instance?.userWahaApiEndpoint ||
						input.userWahaApiEndpoint ||
						undefined,
					instance?.userWahaApiKey || input.userWahaApiKey || undefined,
				);

				// Create webhook URL for the instance (default webhook)
				const defaultWebhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp/${input.instanceId}`;

				// 默认 webhook 配置，包含所有事件
				const defaultWebhookConfig = {
					events: ["message.any", "session.status"],
					hmac: null,
					retries: null,
					customHeaders: null,
				};

				// 用户自定义 webhook 配置，只包含消息事件
				const userWebhookConfig = {
					events: ["message.any", "session.status"],
					hmac: null,
					retries: null,
					customHeaders: null,
				};

				// 构造默认 webhook 对象
				const defaultWebhook: WebhookConfig = {
					url: defaultWebhookUrl,
					...defaultWebhookConfig,
				};

				// 初始化 webhooks 数组，包含默认 webhook
				const webhooks: WebhookConfig[] = [defaultWebhook];

				// 如果实例存在且包含 userWebhooks，则添加它们
				if (instance?.userWebhooks && instance.userWebhooks.length > 0) {
					for (const userUrl of instance.userWebhooks) {
						// 确保 URL 有效
						try {
							// eslint-disable-next-line no-new
							new URL(userUrl); // 验证 URL 格式
							webhooks.push({
								url: userUrl,
								...userWebhookConfig, // 只使用消息事件
							});
						} catch (_e) {
							console.warn(
								`实例 ${input.instanceId} 的无效自定义 webhook URL: ${userUrl}`,
							);
						}
					}
				}

				// 确保元数据保留 userWahaApiKey 和 userWahaApiEndpoint
				const metadata = {};
				if (input.userWahaApiEndpoint) {
					Object.assign(metadata, {
						userWahaApiEndpoint: input.userWahaApiEndpoint,
					});
				}
				if (input.userWahaApiKey) {
					Object.assign(metadata, { userWahaApiKey: input.userWahaApiKey });
				}

				const sessionConfig: SessionConfig = {
					debug: false,
					webhooks: webhooks, // 使用包含所有 webhooks 的数组
					metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
				};

				// Create session request
				const appSessionRequest: SessionCreateRequest = {
					name: sessionName,
					start: input.start,
					config: sessionConfig,
				};

				// 使用类型转换函数
				const apiSessionRequest =
					convertAppToApiSessionCreate(appSessionRequest);

				return await instanceApi.sessions.createSession(apiSessionRequest);
			} catch (error) {
				throw new Error(
					`Failed to create session: ${(error as Error).message}`,
				);
			}
		}),

	// Get session information
	get: protectedProcedure
		.input(z.object({ instanceId: z.string() }))
		.query(async ({ input, ctx }) => {
			try {
				// 获取实例信息，包括 userWahaApiEndpoint 和 userWahaApiKey
				const instance = await ctx.db.query.instances.findFirst({
					where: (instance, { eq }) => eq(instance.id, input.instanceId),
				});

				if (!instance) {
					throw new Error("Instance not found");
				}

				// 创建实例特定的 API 客户端，使用自定义端点和密钥
				const instanceApi = createInstanceApiClient(
					instance.userWahaApiEndpoint || undefined,
					instance.userWahaApiKey || undefined,
				);

				// 尝试获取具体会话
				try {
					const session = await instanceApi.sessions.getSession(
						input.instanceId,
					);
					// Handle potential schema mismatches
					const parsed = SessionInfoSchema.safeParse(session);
					if (!parsed.success) {
						console.error("Session schema validation error:", parsed.error);
						return null;
					}
					return {
						...parsed.data,
						apiEndpoint:
							instance.userWahaApiEndpoint || env.NEXT_PUBLIC_WAHA_API_URL,
						apiKey: instance.userWahaApiKey || env.WHATSAPP_API_KEY,
					};
				} catch (sessionError) {
					// 如果在自定义API没有找到，尝试在默认API中查找
					if (instance.userWahaApiEndpoint) {
						try {
							const defaultApi = createInstanceApiClient();
							const fallbackSession = await defaultApi.sessions.getSession(
								input.instanceId,
							);
							const parsed = SessionInfoSchema.safeParse(fallbackSession);
							if (!parsed.success) {
								console.error(
									"Fallback session schema validation error:",
									parsed.error,
								);
								return null;
							}
							return {
								...parsed.data,
								apiEndpoint: env.NEXT_PUBLIC_WAHA_API_URL,
							};
						} catch (fallbackError) {
							console.error(
								"Failed to get session from fallback API:",
								fallbackError,
							);
							return null;
						}
					}

					console.error(
						`Failed to get session: ${(sessionError as Error).message}`,
					);
					return null;
				}
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
		.mutation(async ({ input, ctx }) => {
			try {
				// 获取实例信息，包括 userWahaApiEndpoint 和 userWahaApiKey
				const instance = await ctx.db.query.instances.findFirst({
					where: (instance, { eq }) => eq(instance.id, input.instanceId),
				});

				// 创建实例特定的 API 客户端，确保同时使用API端点和密钥
				const instanceApi = createInstanceApiClient(
					instance?.userWahaApiEndpoint || undefined,
					instance?.userWahaApiKey || undefined,
				);

				return await instanceApi.sessions.updateSession(
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
		.mutation(async ({ input, ctx }) => {
			try {
				// 获取实例信息，包括 userWahaApiEndpoint 和 userWahaApiKey
				const instance = await ctx.db.query.instances.findFirst({
					where: (instance, { eq }) => eq(instance.id, input.instanceId),
				});

				// 创建实例特定的 API 客户端，确保同时使用API端点和密钥
				const instanceApi = createInstanceApiClient(
					instance?.userWahaApiEndpoint || undefined,
					instance?.userWahaApiKey || undefined,
				);

				await instanceApi.sessions.deleteSession(input.instanceId);
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
		.query(async ({ input, ctx }) => {
			try {
				// 获取实例信息，包括 userWahaApiEndpoint 和 userWahaApiKey
				const instance = await ctx.db.query.instances.findFirst({
					where: (instance, { eq }) => eq(instance.id, input.instanceId),
				});

				// 创建实例特定的 API 客户端，确保同时使用API端点和密钥
				const instanceApi = createInstanceApiClient(
					instance?.userWahaApiEndpoint || undefined,
					instance?.userWahaApiKey || undefined,
				);

				const meInfo = await instanceApi.sessions.getMeInfo(input.instanceId);
				return meInfo;
			} catch (error) {
				throw new Error(
					`Failed to get account info: ${(error as Error).message}`,
				);
			}
		}),

	// Start the session (now using the queue system)
	start: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				userWahaApiEndpoint: z.string().optional(),
				userWahaApiKey: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// Add to the queue, 确保同时传递API端点和密钥
				const queueResult = await queueSessionStart(
					input.instanceId,
					input.userWahaApiEndpoint,
					input.userWahaApiKey,
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
		.input(
			z.object({
				instanceId: z.string(),
				userWahaApiEndpoint: z.string().optional(),
				userWahaApiKey: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// 确保同时使用API端点和密钥
				return await createInstanceApiClient(
					input.userWahaApiEndpoint || undefined,
					input.userWahaApiKey || undefined,
				).sessions.stopSession(input.instanceId);
			} catch (error) {
				throw new Error(`Failed to stop session: ${(error as Error).message}`);
			}
		}),

	// Logout from the session
	logout: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				userWahaApiEndpoint: z.string().optional(),
				userWahaApiKey: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// 确保同时使用API端点和密钥
				return await createInstanceApiClient(
					input.userWahaApiEndpoint || undefined,
					input.userWahaApiKey || undefined,
				).sessions.logoutSession(input.instanceId);
			} catch (error) {
				throw new Error(`Failed to logout: ${(error as Error).message}`);
			}
		}),

	// Restart the session
	restart: protectedProcedure
		.input(
			z.object({
				instanceId: z.string(),
				userWahaApiEndpoint: z.string().optional(),
				userWahaApiKey: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// 确保同时使用API端点和密钥
				return await createInstanceApiClient(
					input.userWahaApiEndpoint || undefined,
					input.userWahaApiKey || undefined,
				).sessions.restartSession(input.instanceId);
			} catch (error) {
				throw new Error(
					`Failed to restart session: ${(error as Error).message}`,
				);
			}
		}),
});
