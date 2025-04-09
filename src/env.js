import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		AUTH_SECRET:
			process.env.NODE_ENV === "production"
				? z.string()
				: z.string().optional(),
		AUTH_DISCORD_ID: z.string(),
		AUTH_DISCORD_SECRET: z.string(),
		AUTH_GOOGLE_ID: z.string(),
		AUTH_GOOGLE_SECRET: z.string(),
		DATABASE_URL: z.string().url(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		OPENAI_API_KEY: z.string(),
		COHERE_API_KEY: z.string(),
		WAHA_API_KEY: z.string(),
		QDRANT_URL: z.string().url(),
		QDRANT_API_KEY: z.string(),
		TRIGGER_SECRET_KEY: z.string(),
		R2_ACCESS_KEY_ID: z.string(),
		R2_SECRET_ACCESS_KEY: z.string(),
		R2_ENDPOINT: z.string(),
		R2_BUCKET: z.string(),
		MARKITDOWN_API_URL: z.string(),
		REDIS_URL: z.string(),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		NEXT_PUBLIC_WAHA_API_URL: z.string(),
		NEXT_PUBLIC_WEBHOOK_URL: z.string(),
		NEXT_PUBLIC_APP_URL: z.string(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		AUTH_SECRET: process.env.AUTH_SECRET,
		AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
		AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
		AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
		AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		COHERE_API_KEY: process.env.COHERE_API_KEY,
		WAHA_API_KEY: process.env.WAHA_API_KEY,
		NEXT_PUBLIC_WAHA_API_URL: process.env.NEXT_PUBLIC_WAHA_API_URL,
		NEXT_PUBLIC_WEBHOOK_URL: process.env.NEXT_PUBLIC_WEBHOOK_URL,
		QDRANT_URL: process.env.QDRANT_URL,
		QDRANT_API_KEY: process.env.QDRANT_API_KEY,
		TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
		R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
		R2_ENDPOINT: process.env.R2_ENDPOINT,
		R2_BUCKET: process.env.R2_BUCKET,
		MARKITDOWN_API_URL: process.env.MARKITDOWN_API_URL,
		REDIS_URL: process.env.REDIS_URL,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
