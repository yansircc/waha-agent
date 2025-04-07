import { env } from "@/env";
import { createLogger } from "@mastra/core/logger";
import { Mastra } from "@mastra/core/mastra";
import { PgVector } from "@mastra/pg";
import { researchAgent } from "./agents";

// 创建PgVector实例
const pgVector = new PgVector(env.DATABASE_URL);

export const mastra = new Mastra({
	agents: { researchAgent },
	vectors: {
		pgVector,
	},
	logger: createLogger({
		name: "Mastra",
		level: "info",
	}),
});
