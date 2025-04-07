import { env } from "@/env";
import { cohere } from "@ai-sdk/cohere";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { createLogger } from "@mastra/core/logger";
import { Mastra } from "@mastra/core/mastra";
import { PgVector } from "@mastra/pg";
import { createVectorQueryTool } from "@mastra/rag";

// 创建向量查询工具
const vectorQueryTool = createVectorQueryTool({
	vectorStoreName: "pgVector",
	indexName: "wm_kb_vectors",
	model: cohere.embedding("embed-multilingual-v3.0"),
});

// 创建研究助手
const researchAgent = new Agent({
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

// 创建PgVector实例
const pgVector = new PgVector(env.DATABASE_URL);

// 创建Mastra实例
export const mastra = new Mastra({
	agents: { researchAgent },
	vectors: {
		pgVector,
	},
	logger: createLogger({
		name: "Mastra",
		level: "info",
	}),
});
