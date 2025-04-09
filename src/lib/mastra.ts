import { env } from "@/env";
import { MastraClient } from "@mastra/client-js";

export const mastraClient = new MastraClient({
	baseUrl: env.MASTRA_API_URL,
});
