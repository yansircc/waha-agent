import type { Config } from "drizzle-kit";

export default {
	schema: "./src/server/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL || "",
	},
	tablesFilter: ["11-waha-mastra_*"],
} satisfies Config;
