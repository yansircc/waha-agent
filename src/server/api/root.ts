import { agentsRouter } from "@/server/api/routers/agents";
import { chatRouter } from "@/server/api/routers/chat";
import { instancesRouter } from "@/server/api/routers/instances";
import { kbsRouter } from "@/server/api/routers/kb";
import { mastraAgentsRouter } from "@/server/api/routers/mastra-agents";
import { wahaAuthRouter } from "@/server/api/routers/waha-auth";
import { wahaChattingRouter } from "@/server/api/routers/waha-chatting";
import { wahaProfileRouter } from "@/server/api/routers/waha-profile";
import { wahaSessionsRouter } from "@/server/api/routers/waha-sessions";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	agents: agentsRouter,
	kbs: kbsRouter,
	instances: instancesRouter,
	wahaSessions: wahaSessionsRouter,
	wahaAuth: wahaAuthRouter,
	wahaProfile: wahaProfileRouter,
	wahaChatting: wahaChattingRouter,
	mastraAgents: mastraAgentsRouter,
	chat: chatRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const result = await trpc.post.all();
 */
export const createCaller = createCallerFactory(appRouter);
