import { vercelAIAgent } from "./vercel-ai";

const result = await vercelAIAgent({
	userId: "123",
	kbIds: ["6fed5e4f-a950-48ea-bbae-92e188ddd459"],
	messages: [
		{
			role: "user",
			content: "帮我搜索知识库，什么是诺基亚思维？",
		},
	],
});

console.log(result.text);
