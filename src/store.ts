import { cohere } from "@ai-sdk/cohere";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { mastra } from "./mastra";

// Load the paper
const paperUrl = "https://arxiv.org/html/1706.03762";
const response = await fetch(paperUrl);
const paperText = await response.text();

// Create document and chunk it
const doc = MDocument.fromText(paperText);
const chunks = await doc.chunk({
	strategy: "recursive",
	size: 512,
	overlap: 50,
	separator: "\n",
});

console.log("Number of chunks:", chunks.length);

// Embed all chunks at once
const { embeddings: allEmbeddings } = await embedMany({
	model: cohere.embedding("embed-multilingual-v3.0"),
	values: chunks.map((chunk) => chunk.text),
});

console.log(`Successfully embedded ${allEmbeddings.length} chunks`);

// Get the vector store instance from Mastra
const vectorStore = mastra.getVector("pgVector");

// Create an index for our paper chunks
await vectorStore.createIndex({
	indexName: "papers",
	dimension: 1024,
});

// Store all embeddings at once
await vectorStore.upsert({
	indexName: "papers",
	vectors: allEmbeddings,
	metadata: chunks.map((chunk) => ({
		text: chunk.text,
		source: "transformer-paper",
	})),
});
