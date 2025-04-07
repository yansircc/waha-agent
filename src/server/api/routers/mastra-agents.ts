import { mastraApi } from "@/lib/mastra-api";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type {
	MastraAgent,
	MastraGenerateRequest,
	MastraGenerateResponse,
} from "@/types/mastra-types";
import { MastraGenerateRequestSchema } from "@/types/schemas";
import { z } from "zod";

export const mastraAgentsRouter = createTRPCRouter({
	// Get all available agents
	getAll: protectedProcedure.query(async () => {
		try {
			const agents = await mastraApi.agents.getAll();
			return agents as MastraAgent[];
		} catch (error) {
			console.error("Error fetching agents:", error);
			throw new Error(`Failed to fetch agents: ${(error as Error).message}`);
		}
	}),

	// Get agent by ID
	getById: protectedProcedure
		.input(z.object({ agentId: z.string() }))
		.query(async ({ input }) => {
			try {
				const agent = await mastraApi.agents.getById(input.agentId);
				return agent as MastraAgent;
			} catch (error) {
				console.error("Error fetching agent:", error);
				throw new Error(`Failed to fetch agent: ${(error as Error).message}`);
			}
		}),

	// Generate a response from an agent
	generate: protectedProcedure
		.input(
			z.object({
				agentId: z.string(),
				data: MastraGenerateRequestSchema,
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const requestData: MastraGenerateRequest = input.data;
				const response = await mastraApi.agents.generate(
					input.agentId,
					requestData,
				);

				return response as MastraGenerateResponse;
			} catch (error) {
				console.error("Error generating response:", error);
				throw new Error(
					`Failed to generate response: ${(error as Error).message}`,
				);
			}
		}),

	// Weather agent specific endpoint
	getWeather: protectedProcedure
		.input(
			z.object({
				agentId: z.string(),
				query: z.string(),
				threadId: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// Convert the query to a message structure
				const messages = [
					{
						role: "system" as const,
						content:
							"You are a helpful weather assistant that provides accurate weather information.",
					},
					{
						role: "user" as const,
						content: input.query,
					},
				];

				const requestData: MastraGenerateRequest = {
					messages,
					threadId: input.threadId,
					resourceId: `weather-${Date.now()}`,
				};

				const response = await mastraApi.agents.generate(
					input.agentId,
					requestData,
				);

				return response;
			} catch (error) {
				console.error("Error getting weather:", error);
				throw new Error(
					`Failed to get weather information: ${(error as Error).message}`,
				);
			}
		}),
});
