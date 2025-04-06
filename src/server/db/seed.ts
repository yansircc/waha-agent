import { db } from "./index";
import { knowledgeBases } from "./schema";

// Sample knowledge base data
const knowledgeBaseData = [
	{
		name: "WhatsApp FAQ",
		description: "Common questions and answers about WhatsApp",
		content: `
      Q: What is WhatsApp?
      A: WhatsApp is a free messaging and voice-over-IP service owned by Meta Platforms. It allows users to send text messages and voice messages, make voice and video calls, and share images, documents, user locations, and other content.

      Q: How do I set up WhatsApp?
      A: Download the app from your app store, open it, verify your phone number, and set up your profile.

      Q: Is WhatsApp secure?
      A: WhatsApp uses end-to-end encryption for personal messages, which means only you and the person you're communicating with can read what's sent.
    `,
		metadata: {
			category: "General",
			tags: ["whatsapp", "faq", "basics"],
		},
	},
	{
		name: "AI Bot Development",
		description: "Information about creating AI bots for WhatsApp",
		content: `
      Developing AI bots for WhatsApp involves several steps:
      
      1. Setting up a WhatsApp Business API account
      2. Creating a webhook endpoint to receive messages
      3. Integrating with an AI service like OpenAI or DialogFlow
      4. Implementing conversation flows
      5. Testing and deploying your bot
      
      Common challenges include handling media messages, managing context in conversations, and dealing with rate limits.
    `,
		metadata: {
			category: "Development",
			tags: ["ai", "bots", "development", "technical"],
		},
	},
	{
		name: "Customer Service Templates",
		description: "Templates for customer service responses",
		content: `
      Greeting:
      "Hello [Customer Name], thank you for reaching out to [Company Name]. My name is [Bot Name], and I'm here to assist you today."
      
      Unable to Help:
      "I understand your concern about [Issue]. This requires specialized assistance. Let me connect you with a human representative."
      
      Follow-up:
      "Just checking in regarding your previous inquiry about [Topic]. Has the issue been resolved to your satisfaction?"
      
      Closing:
      "Thank you for contacting [Company Name]. If you have any further questions, feel free to reach out. Have a great day!"
    `,
		metadata: {
			category: "Templates",
			tags: ["customer service", "templates", "responses"],
		},
	},
];

// Function to seed knowledge base data
export async function seedKnowledgeBase(userId: string) {
	console.log("Seeding knowledge base data...");

	for (const kb of knowledgeBaseData) {
		await db.insert(knowledgeBases).values({
			name: kb.name,
			description: kb.description,
			content: kb.content,
			metadata: kb.metadata,
			createdById: userId,
		});
	}

	console.log("Knowledge base seeding complete!");
}

// Main seed function that can be called from CLI
export async function seed(userId: string) {
	if (!userId) {
		console.error("User ID is required for seeding data");
		process.exit(1);
	}

	await seedKnowledgeBase(userId);
	console.log("All seed operations completed successfully!");
}

// Allow direct execution via command line
if (require.main === module) {
	const userId = process.argv[2];
	if (!userId) {
		console.error("Usage: ts-node seed.ts <userId>");
		process.exit(1);
	}

	seed(userId)
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Error during seeding:", error);
			process.exit(1);
		});
}
