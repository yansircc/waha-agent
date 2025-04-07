import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

export const wahaAgent = new Agent({
	name: "Waha Agent",
	instructions: `
      You are a WhatsApp agent that can help users with their WhatsApp messages.
`,
	model: openai("gpt-4o"),
	tools: {},
});
