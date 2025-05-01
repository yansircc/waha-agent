import { bulkCrawl } from "@/trigger/bulk-crawl";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const demoRouter = createTRPCRouter({
	triggerBulkCrawl: protectedProcedure
		.input(
			z.object({
				urls: z.array(z.string().url()),
				userId: z.string(),
				kbId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// Trigger the bulk crawl task
				const handle = await bulkCrawl.trigger({ ...input });

				// Create a public access token specific to this run
				const publicAccessToken = await triggerAuth.createPublicToken({
					scopes: {
						read: {
							runs: [handle.id],
						},
					},
				});

				return {
					success: true,
					handle,
					token: publicAccessToken,
				};
			} catch (error) {
				console.error("[tRPC] Error triggering bulk crawl task:", error);
				throw new Error("Failed to trigger bulk crawl task");
			}
		}),
});

export type DemoRouter = typeof demoRouter;
