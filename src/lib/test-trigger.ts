import { agentChat } from "@/trigger/agent-chat";

agentChat.trigger({
	userId: "123",
	agentId: "123",
	conversationId: "123",
	webhookUrl: "http://localhost:3000/api/webhooks/chat",
	messages: [
		{
			role: "user",
			content: "现在的谷歌现在特别强调什么？",
		},
	],
});
