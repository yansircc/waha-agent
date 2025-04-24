import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { agentToKb, agents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const agentsRouter = createTRPCRouter({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const result = await ctx.db.query.agents.findMany({
			where: (agent, { eq }) => eq(agent.createdById, ctx.session.user.id),
			orderBy: (agent, { desc }) => [desc(agent.createdAt)],
			with: {
				kbs: {
					with: {
						kb: true,
					},
				},
			},
		});

		// Transform the result to include kb objects
		return result.map((agent) => ({
			...agent,
			kbs: agent.kbs.map((relation) => relation.kb),
		}));
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.db.query.agents.findFirst({
				where: (agent, { eq, and }) =>
					and(
						eq(agent.id, input.id),
						eq(agent.createdById, ctx.session.user.id),
					),
				with: {
					kbs: {
						with: {
							kb: true,
						},
					},
				},
			});

			if (!result) return null;

			// Transform the result to include kb objects
			return {
				...result,
				kbs: result.kbs.map((relation) => relation.kb),
			};
		}),

	create: protectedProcedure
		.input(
			z.object({
				apiKey: z.string(),
				name: z.string().min(1).max(255),
				prompt: z.string(),
				model: z.string(),
				kbIds: z.array(z.string()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Create the agent
			const agentData = {
				apiKey: input.apiKey,
				name: input.name,
				prompt: input.prompt,
				model: input.model,
				kbIds: input.kbIds || null,
				createdById: ctx.session.user.id,
			};

			const insertResult = await ctx.db
				.insert(agents)
				.values(agentData)
				.returning();

			if (!insertResult[0]) {
				throw new Error("Failed to create agent");
			}

			const agentId = insertResult[0].id;

			// If knowledge base IDs are provided, create the relationships
			if (input.kbIds?.length) {
				await ctx.db.insert(agentToKb).values(
					input.kbIds.map((kbId) => ({
						agentId,
						kbId: kbId,
					})),
				);
			}

			return insertResult[0];
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				apiKey: z.string().optional(),
				name: z.string().min(1).max(255).optional(),
				prompt: z.string().optional(),
				model: z.string().optional(),
				kbIds: z.array(z.string()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// First make sure the agent belongs to the user
			const agent = await ctx.db.query.agents.findFirst({
				where: (agent, { eq, and }) =>
					and(
						eq(agent.id, input.id),
						eq(agent.createdById, ctx.session.user.id),
					),
			});

			if (!agent) {
				throw new Error(
					"Agent not found or you don't have permission to update it",
				);
			}

			const updateData: Record<string, unknown> = {};
			if (input.name !== undefined) updateData.name = input.name;
			if (input.apiKey !== undefined) updateData.apiKey = input.apiKey;
			if (input.prompt !== undefined) updateData.prompt = input.prompt;
			if (input.kbIds !== undefined) updateData.kbIds = input.kbIds;
			if (input.model !== undefined) updateData.model = input.model;

			// Update the agent
			const updateResult = await ctx.db
				.update(agents)
				.set(updateData)
				.where(eq(agents.id, input.id))
				.returning();

			if (!updateResult[0]) {
				throw new Error("Failed to update agent");
			}

			// If knowledge base IDs are provided, update the relationships
			if (input.kbIds !== undefined) {
				// Delete existing relationships
				await ctx.db.delete(agentToKb).where(eq(agentToKb.agentId, input.id));

				// Create new relationships
				if (input.kbIds.length > 0) {
					await ctx.db.insert(agentToKb).values(
						input.kbIds.map((kbId) => ({
							agentId: input.id,
							kbId: kbId,
						})),
					);
				}
			}

			return updateResult[0];
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// First make sure the agent belongs to the user
			const agent = await ctx.db.query.agents.findFirst({
				where: (agent, { eq, and }) =>
					and(
						eq(agent.id, input.id),
						eq(agent.createdById, ctx.session.user.id),
					),
			});

			if (!agent) {
				throw new Error(
					"Agent not found or you don't have permission to delete it",
				);
			}

			// Delete the agent (relations will be cascade deleted)
			await ctx.db.delete(agents).where(eq(agents.id, input.id));
			return { success: true };
		}),

	getKbs: protectedProcedure
		.input(
			z.object({
				agentId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const result = await ctx.db.query.agentToKb.findMany({
				where: eq(agentToKb.agentId, input.agentId),
			});

			return result;
		}),
});
