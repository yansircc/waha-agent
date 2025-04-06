import { relations, sql } from "drizzle-orm";
import { index, pgTableCreator, primaryKey } from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `wm_${name}`);

export const posts = createTable(
	"post",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		name: d.varchar({ length: 256 }),
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
		index("created_by_idx").on(t.createdById),
		index("name_idx").on(t.name),
	],
);

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

export const verificationTokens = createTable(
	"verification_token",
	(d) => ({
		identifier: d.varchar({ length: 255 }).notNull(),
		token: d.varchar({ length: 255 }).notNull(),
		expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
	}),
	(t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// WhatsApp AI Agent schema
export const agents = createTable(
	"agent",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: d.varchar({ length: 255 }).notNull(),
		prompt: d.text().notNull(),
		knowledgeBaseIds: d.text().array(), // Array of knowledge base IDs
		isActive: d.boolean().default(false).notNull(),
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
	knowledgeBases: many(agentToKnowledgeBase, {
		relationName: "agentToKnowledgeBase",
	}),
}));

// Knowledge Base schema
export const knowledgeBases = createTable(
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

export const knowledgeBasesRelations = relations(
	knowledgeBases,
	({ one, many }) => ({
		user: one(users, {
			fields: [knowledgeBases.createdById],
			references: [users.id],
		}),
		agents: many(agentToKnowledgeBase, { relationName: "kbToAgent" }),
	}),
);

// Junction table for many-to-many relationship between agents and knowledge bases
export const agentToKnowledgeBase = createTable(
	"agent_to_kb",
	(d) => ({
		agentId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		knowledgeBaseId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => knowledgeBases.id, { onDelete: "cascade" }),
	}),
	(t) => [
		primaryKey({ columns: [t.agentId, t.knowledgeBaseId] }),
		index("idx_agent_to_kb_agent").on(t.agentId),
		index("idx_agent_to_kb_kb").on(t.knowledgeBaseId),
	],
);

// Define relations for the junction table
export const agentToKnowledgeBaseRelations = relations(
	agentToKnowledgeBase,
	({ one }) => ({
		agent: one(agents, {
			fields: [agentToKnowledgeBase.agentId],
			references: [agents.id],
			relationName: "agentToKnowledgeBase",
		}),
		knowledgeBase: one(knowledgeBases, {
			fields: [agentToKnowledgeBase.knowledgeBaseId],
			references: [knowledgeBases.id],
			relationName: "kbToAgent",
		}),
	}),
);

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
