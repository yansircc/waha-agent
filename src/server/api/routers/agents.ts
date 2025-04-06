import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { agentToKnowledgeBase, agents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const agentsRouter = createTRPCRouter({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const result = await ctx.db.query.agents.findMany({
			where: (agent, { eq }) => eq(agent.createdById, ctx.session.user.id),
			orderBy: (agent, { desc }) => [desc(agent.createdAt)],
			with: {
				knowledgeBases: {
					with: {
						knowledgeBase: true,
					},
				},
			},
		});

		// Transform the result to include knowledgeBase objects
		return result.map((agent) => ({
			...agent,
			knowledgeBases: agent.knowledgeBases.map(
				(relation) => relation.knowledgeBase,
			),
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
					knowledgeBases: {
						with: {
							knowledgeBase: true,
						},
					},
				},
			});

			if (!result) return null;

			// Transform the result to include knowledgeBase objects
			return {
				...result,
				knowledgeBases: result.knowledgeBases.map(
					(relation) => relation.knowledgeBase,
				),
			};
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(255),
				prompt: z.string(),
				knowledgeBaseIds: z.array(z.string()).optional(),
				isActive: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Create the agent
			const agentData = {
				name: input.name,
				prompt: input.prompt,
				knowledgeBaseIds: input.knowledgeBaseIds || null,
				isActive: input.isActive ?? false,
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
			if (input.knowledgeBaseIds?.length) {
				await ctx.db.insert(agentToKnowledgeBase).values(
					input.knowledgeBaseIds.map((kbId) => ({
						agentId,
						knowledgeBaseId: kbId,
					})),
				);
			}

			return insertResult[0];
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(255).optional(),
				prompt: z.string().optional(),
				knowledgeBaseIds: z.array(z.string()).optional(),
				isActive: z.boolean().optional(),
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
			if (input.prompt !== undefined) updateData.prompt = input.prompt;
			if (input.knowledgeBaseIds !== undefined)
				updateData.knowledgeBaseIds = input.knowledgeBaseIds;
			if (input.isActive !== undefined) updateData.isActive = input.isActive;

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
			if (input.knowledgeBaseIds !== undefined) {
				// Delete existing relationships
				await ctx.db
					.delete(agentToKnowledgeBase)
					.where(eq(agentToKnowledgeBase.agentId, input.id));

				// Create new relationships
				if (input.knowledgeBaseIds.length > 0) {
					await ctx.db.insert(agentToKnowledgeBase).values(
						input.knowledgeBaseIds.map((kbId) => ({
							agentId: input.id,
							knowledgeBaseId: kbId,
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

	toggleActive: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
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

			// Toggle the isActive status
			const newIsActive = !agent.isActive;

			const result = await ctx.db
				.update(agents)
				.set({ isActive: newIsActive })
				.where(eq(agents.id, input.id))
				.returning();

			return result[0];
		}),
});
