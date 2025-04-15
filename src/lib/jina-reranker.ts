interface RerankResponse {
	model: string;
	usage: {
		total_tokens: number;
	};
	results: {
		index: number;
		relevance_score: number;
	}[];
}

export async function reranker(
	query: string,
	documents: string[],
	model = "jina-reranker-v2-base-multilingual",
	top_n = 3,
): Promise<RerankResponse> {
	const response = await fetch("https://api.jina.ai/v1/rerank", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization:
				"Bearer jina_f24d8ea3d34c420faa77e38b69f1d27evOPojzrc4j3zQmnT07THhgTqNm5l",
		},
		body: JSON.stringify({
			model,
			query,
			top_n,
			documents,
			return_documents: false,
		}),
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data: RerankResponse = await response.json();
	return data;
}
