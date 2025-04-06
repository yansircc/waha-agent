import { agentsRouter } from "@/server/api/routers/agents";
import { instancesRouter } from "@/server/api/routers/instances";
import { knowledgeBasesRouter } from "@/server/api/routers/knowledgeBases";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	agents: agentsRouter,
	knowledgeBases: knowledgeBasesRouter,
	instances: instancesRouter,
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
