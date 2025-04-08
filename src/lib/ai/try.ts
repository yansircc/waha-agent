import { env } from "@/env";
import { wahaAgent } from "../waha-agent";

// Direct fetch approach
console.log("=== Direct fetch approach ===");
const response = await fetch(env.NEXT_PUBLIC_AUTORAG_API_URL, {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		Authorization: `Bearer ${env.AUTORAG_API_KEY}`,
	},
	body: JSON.stringify({
		query: "张伟的成绩怎样？",
		rewrite_query: true,
		max_num_results: 10,
		ranking_options: {
			score_threshold: 0.5,
		},
	}),
});

const data = await response.json();
console.log(data);

// // wahaAgent approach
// console.log("\n=== wahaAgent approach ===");
// const result = await wahaAgent({
// 	apiKey: env.OPENROUTER_API_KEY,
// 	model: "openai/gpt-4o-mini",
// 	prompt: "王芳理综成绩多少？",
// 	documentId: "default",
// });

// console.log(result);

// curl https://api.cloudflare.com/client/v4/accounts/d1da6c26f60e13fb006a3d4b5dae3f09/autorag/rags/red-resonance-95e9/ai-search \
//     -H 'Content-Type: application/json' \
//     -H 'Authorization: Bearer p_6vpLXeJxBYCUSTHF47P2rEKUtsLHd4o0roMTxM' \
//     -d '{
//       "query": "How do I train a llama to deliver coffee?"
//     }'

// {
//   success: true,
//   result: {
//     object: "vector_store.search_results.page",
//     search_query: "How do I train a llama to deliver coffee?",
//     response: "I couldn't find any relevant documents related to training a llama to deliver coffee. Unfortunately, I won't be able to provide an answer based on the content of matched documents.\n\nIf you'd like, I can try to provide a general response based on my knowledge, but please note that it won't be supported by any specific documents. Would you like me to attempt a response without relying on retrieved documents?",
//     data: [],
//     has_more: false,
//     next_page: null,
//   },
// }
