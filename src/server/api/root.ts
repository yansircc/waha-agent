import { agentsRouter } from "@/server/api/routers/agents";
import { chatRouter } from "@/server/api/routers/chat";
import { chatHistoryRouter } from "@/server/api/routers/chat-history";
import { emailsRouter } from "@/server/api/routers/emails";
import { freeEmailsRouter } from "@/server/api/routers/free-emails";
import { instancesRouter } from "@/server/api/routers/instances";
import { kbsRouter } from "@/server/api/routers/kb";
import { sessionQueueRouter } from "@/server/api/routers/session-queue";
import { wahaSessionsRouter } from "@/server/api/routers/waha";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { crawlRouter } from "./routers/crawl";
import { demoRouter } from "./routers/demo";
import { documentsRouter } from "./routers/documents";
import { qdrantRouter } from "./routers/qdrant";
import { s3Router } from "./routers/s3";

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
	chat: chatRouter,
	chatHistory: chatHistoryRouter,
	s3: s3Router,
	qdrant: qdrantRouter,
	emails: emailsRouter,
	freeEmails: freeEmailsRouter,
	documents: documentsRouter,
	crawl: crawlRouter,
	demo: demoRouter,
	sessionQueue: sessionQueueRouter,
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
