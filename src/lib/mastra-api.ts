import { env } from "@/env";
import type {
	MastraGenerateRequest,
	MastraGenerateResponse,
} from "@/types/mastra-types";

/**
 * Client for interacting with the Mastra API
 */
export const mastraApi = {
	agents: {
		/**
		 * Get all available agents
		 */
		getAll: async () => {
			const response = await fetch(`${env.MASTRA_API_URL}/agents`);

			if (!response.ok) {
				throw new Error(`Failed to fetch agents: ${response.statusText}`);
			}

			return response.json();
		},

		/**
		 * Get agent by ID
		 */
		getById: async (agentId: string) => {
			const response = await fetch(`${env.MASTRA_API_URL}/agents/${agentId}`);

			if (!response.ok) {
				throw new Error(`Failed to fetch agent: ${response.statusText}`);
			}

			return response.json();
		},

		/**
		 * Generate a response from an agent
		 */
		generate: async (
			agentId: string,
			requestData: MastraGenerateRequest,
		): Promise<MastraGenerateResponse> => {
			const response = await fetch(
				`${env.MASTRA_API_URL}/agents/${agentId}/generate`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestData),
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to generate response: ${response.statusText}`);
			}

			return response.json();
		},

		/**
		 * Stream a response from an agent (returns response URL for client-side streaming)
		 */
		getStreamUrl: (agentId: string) => {
			return `${env.MASTRA_API_URL}/agents/${agentId}/stream`;
		},
	},
};
