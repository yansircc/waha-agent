import { z } from "zod";

// Zod schemas as single source of truth
export const AgentSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	temperature: z.number().optional(),
	kbIds: z.array(z.string()).nullable(),
	systemPrompt: z.string().optional(),
	apiKey: z.string(),
	prompt: z.string(),
	model: z.string(),
	createdAt: z.date().nullable(),
	updatedAt: z.date().nullable(),
});

const KnowledgeBaseSchema = z.object({
	id: z.string(),
	name: z.string(),
});

export const ApiMessageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string(),
});

const MessageSchema = ApiMessageSchema.extend({
	id: z.string(),
});

// Infer TypeScript types from Zod schemas
export type Agent = z.infer<typeof AgentSchema>;
export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>;
export type Message = z.infer<typeof MessageSchema>;
