import { z } from "zod";

// Session相关验证模式
const SessionStatusEnum = z.enum([
	"STARTING",
	"RUNNING",
	"STOPPED",
	"ERROR",
	"SCAN_QR_CODE",
	"WORKING",
]);

// Webhook 相关验证模式
const WebhookSchema = z.object({
	url: z.string().url(),
	events: z.array(z.string()),
	hmac: z.union([z.string(), z.record(z.unknown()), z.null()]).optional(),
	retries: z.union([z.number(), z.record(z.unknown()), z.null()]).optional(),
	customHeaders: z.record(z.string()).nullable().optional(),
});

const SessionConfigSchema = z.object({
	metadata: z
		.record(
			z.union([
				z.string(),
				z.number(),
				z.boolean(),
				z.null(),
				z.record(z.unknown()),
			]),
		)
		.optional(),
	proxy: z.string().nullable().optional(),
	debug: z.boolean().optional().default(false),
	noweb: z
		.object({
			store: z
				.object({
					enabled: z.boolean().optional().default(true),
					fullSync: z.boolean().optional().default(false),
				})
				.optional(),
		})
		.optional(),
	webhooks: z.array(WebhookSchema).optional(),
});

export const SessionInfoSchema = z.object({
	id: z.string().optional(),
	name: z.string(),
	status: SessionStatusEnum,
	config: SessionConfigSchema,
	qrCode: z.string().optional(),
	error: z.string().optional(),
	updatedAt: z.string().optional(),
	createdAt: z.string().optional(),
	apiKey: z.string().optional(),
});
