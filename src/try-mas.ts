import { mastra } from "./mastra";
const agent = mastra.getAgent("researchAgent");

// Basic query about concepts
const query1 = "王芳的理综多少分？";
const response1 = await agent.generate(query1);
console.log("\nQuery:", query1);
console.log("Response:", response1.text);
