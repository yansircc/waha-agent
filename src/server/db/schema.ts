import { relations, sql } from "drizzle-orm";
import { index, pgTableCreator, primaryKey } from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `waha_${name}`);

export const users = createTable("user", (d) => ({
	id: d
		.varchar({ length: 255 })
		.notNull()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: d.varchar({ length: 255 }),
	email: d.varchar({ length: 255 }).notNull(),
	emailVerified: d
		.timestamp({
			mode: "date",
			withTimezone: true,
		})
		.default(sql`CURRENT_TIMESTAMP`),
	image: d.varchar({ length: 255 }),
}));

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	agents: many(agents),
	instances: many(instances),
	emailConfigs: many(emailConfigs),
	freeEmails: many(freeEmails),
}));

export const accounts = createTable(
	"account",
	(d) => ({
		userId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
		provider: d.varchar({ length: 255 }).notNull(),
		providerAccountId: d.varchar({ length: 255 }).notNull(),
		refresh_token: d.text(),
		access_token: d.text(),
		expires_at: d.integer(),
		token_type: d.varchar({ length: 255 }),
		scope: d.varchar({ length: 255 }),
		id_token: d.text(),
		session_state: d.varchar({ length: 255 }),
	}),
	(t) => [
		primaryKey({ columns: [t.provider, t.providerAccountId] }),
		index("account_user_id_idx").on(t.userId),
	],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
	"session",
	(d) => ({
		sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
		userId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
	}),
	(t) => [index("t_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// WhatsApp AI Agent schema
export const agents = createTable(
	"agent",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		apiKey: d.text().notNull(),
		name: d.varchar({ length: 255 }).notNull(),
		prompt: d.text().notNull(),
		model: d.varchar({ length: 255 }).notNull(),
		kbIds: d.text().array(),
		createdById: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("agent_created_by_idx").on(t.createdById),
		index("agent_name_idx").on(t.name),
	],
);

export const agentsRelations = relations(agents, ({ one, many }) => ({
	user: one(users, { fields: [agents.createdById], references: [users.id] }),
	instances: many(instances),
	kbs: many(agentToKb, {
		relationName: "agentToKb",
	}),
	emailConfigs: many(emailConfigs),
}));

// Email Configuration schema
export const emailConfigs = createTable(
	"email_config",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		signature: d.text(), // Optional HTML signature
		plunkApiKey: d.text().notNull(), // API key for Plunk email service
		wechatPushApiKey: d.text().notNull(), // API key for Wechat push service
		formDataFormId: d.varchar({ length: 255 }).notNull().unique(), // Form-Data form ID - must be unique
		formDataWebhookSecret: d.text().notNull(), // Form-Data webhook secret
		agentId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => agents.id), // Associated agent for responses
		createdById: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("email_config_created_by_idx").on(t.createdById),
		index("email_config_agent_idx").on(t.agentId),
		index("email_config_form_id_idx").on(t.formDataFormId), // Add index for form ID lookups
	],
);

export const emailConfigsRelations = relations(emailConfigs, ({ one }) => ({
	user: one(users, {
		fields: [emailConfigs.createdById],
		references: [users.id],
	}),
	agent: one(agents, {
		fields: [emailConfigs.agentId],
		references: [agents.id],
	}),
}));

// Free Email schema for formsubmit.co integration
export const freeEmails = createTable(
	"free_email",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		emailAddress: d.varchar({ length: 255 }).notNull().unique(),
		alias: d.varchar({ length: 255 }).unique(), // formsubmit.co alias
		plunkApiKey: d.text(),
		wechatPushApiKey: d.text(),
		formSubmitActivated: d.boolean().default(false).notNull(), // indicates if formsubmit.co has been activated
		setupCompleted: d.boolean().default(false).notNull(), // indicates if all setup steps are completed
		createdById: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("free_email_created_by_idx").on(t.createdById),
		index("free_email_email_address_idx").on(t.emailAddress),
		index("free_email_alias_idx").on(t.alias),
	],
);

export const freeEmailsRelations = relations(freeEmails, ({ one }) => ({
	user: one(users, {
		fields: [freeEmails.createdById],
		references: [users.id],
	}),
}));

// Knowledge Base schema
export const kbs = createTable(
	"kb",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: d.varchar({ length: 255 }).notNull(),
		description: d.text(),
		content: d.text().notNull(),
		fileUrl: d.text(),
		fileType: d.varchar({ length: 50 }),
		metadata: d.jsonb(),
		createdById: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("kb_created_by_idx").on(t.createdById),
		index("kb_name_idx").on(t.name),
	],
);

export const kbsRelations = relations(kbs, ({ one, many }) => ({
	user: one(users, {
		fields: [kbs.createdById],
		references: [users.id],
	}),
	agents: many(agentToKb, { relationName: "kbToAgent" }),
	documents: many(documents),
}));

// Documents schema for storing individual documents within a knowledge base
export const documents = createTable(
	"document",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: d.varchar({ length: 255 }).notNull(),
		content: d.text(), // Content may be null now since we're storing files in R2
		fileUrl: d.text(), // S3/R2 URL for the file
		filePath: d.text(), // Path in the storage bucket (userId/kbId/filename)
		fileType: d.varchar({ length: 50 }),
		fileSize: d.integer(),
		mimeType: d.varchar({ length: 100 }), // Store the MIME type
		isText: d.boolean().default(false), // Flag for text files (e.g., md, txt)
		metadata: d.jsonb(),
		vectorizationStatus: d.varchar({ length: 20 }).default("pending").notNull(),
		kbId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => kbs.id, { onDelete: "cascade" }),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("document_kb_id_idx").on(t.kbId),
		index("document_name_idx").on(t.name),
	],
);

export const documentsRelations = relations(documents, ({ one }) => ({
	kb: one(kbs, {
		fields: [documents.kbId],
		references: [kbs.id],
	}),
}));

// Junction table for many-to-many relationship between agents and knowledge bases
export const agentToKb = createTable(
	"agent_to_kb",
	(d) => ({
		agentId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		kbId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => kbs.id, { onDelete: "cascade" }),
	}),
	(t) => [
		primaryKey({ columns: [t.agentId, t.kbId] }),
		index("idx_agent_to_kb_agent").on(t.agentId),
		index("idx_agent_to_kb_kb").on(t.kbId),
	],
);

// Define relations for the junction table
export const agentToKbRelations = relations(agentToKb, ({ one }) => ({
	agent: one(agents, {
		fields: [agentToKb.agentId],
		references: [agents.id],
		relationName: "agentToKb",
	}),
	kb: one(kbs, {
		fields: [agentToKb.kbId],
		references: [kbs.id],
		relationName: "kbToAgent",
	}),
}));

// WhatsApp Instance schema
export const instances = createTable(
	"instance",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: d.varchar({ length: 255 }).notNull(),
		phoneNumber: d.varchar({ length: 20 }),
		status: d.varchar({ length: 50 }).default("disconnected").notNull(),
		agentId: d.varchar({ length: 255 }).references(() => agents.id),
		createdById: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		qrCode: d.text(),
		sessionData: d.jsonb(),
		userWebhooks: d.text().array(),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("instance_created_by_idx").on(t.createdById),
		index("instance_agent_idx").on(t.agentId),
	],
);

export const instancesRelations = relations(instances, ({ one }) => ({
	user: one(users, { fields: [instances.createdById], references: [users.id] }),
	agent: one(agents, { fields: [instances.agentId], references: [agents.id] }),
}));

// 添加WhatsApp消息表
export const waMessages = createTable(
	"wa_message",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		messageId: d.varchar({ length: 255 }).notNull(),
		sessionName: d.varchar({ length: 255 }).notNull(),
		fromMe: d.boolean().notNull(),
		timestamp: d.timestamp({ withTimezone: true }).notNull(),
		chatId: d.varchar({ length: 255 }).notNull(),
		type: d.varchar({ length: 50 }).notNull(),
		author: d.varchar({ length: 255 }),
		body: d.text(),
		caption: d.text(),
		userId: d.varchar({ length: 255 }).notNull(),
		rawData: d.text(),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("wa_message_user_id_idx").on(t.userId),
		index("wa_message_session_idx").on(t.sessionName),
	],
);

// waMessages关系类型
export type WaMessage = typeof waMessages.$inferSelect;
export type InsertWaMessage = typeof waMessages.$inferInsert;

// Types for the Email Configuration schema
export type EmailConfig = typeof emailConfigs.$inferSelect;
export type InsertEmailConfig = typeof emailConfigs.$inferInsert;
