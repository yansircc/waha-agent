import { env } from "@/env";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { QdrantVector } from "@mastra/qdrant";
import { vectorQueryTool } from "../tools";

export const vectorStore = new QdrantVector(
	env.QDRANT_URL,
	env.QDRANT_API_KEY,
	false,
);

export const wahaAgent = new Agent({
	name: "Waha Agent",
	instructions: `
      You are a WhatsApp agent that can help users with their WhatsApp messages.
`,
	model: openai("gpt-4o"),
	tools: {},
});

export const researchAgent = new Agent({
	name: "Research Assistant",
	instructions: `You are a helpful research assistant that analyzes academic papers and technical documents.
    Use the provided vector query tool to find relevant information from your knowledge base, 
    and provide accurate, well-supported answers based on the retrieved content.
    Focus on the specific content available in the tool and acknowledge if you cannot find sufficient information to answer a question.
    Base your responses only on the content provided, not on general knowledge.`,
	model: openai("gpt-4o"),
	tools: {
		vectorQueryTool,
	},
});
