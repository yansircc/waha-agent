import { cohere } from "@ai-sdk/cohere";
import { createVectorQueryTool } from "@mastra/rag";

export const vectorQueryTool = createVectorQueryTool({
	vectorStoreName: "pgVector",
	indexName: "kb_vectors",
	model: cohere.embedding("embed-multilingual-v3.0"),
});
