import { cohere } from "@ai-sdk/cohere";
import { QdrantClient } from "@qdrant/qdrant-js";
import { embed } from "ai";
import { env } from "../env";

interface VectorPayload {
	[key: string]: unknown;
}

interface PointData {
	id: string | number;
	vector: number[];
	payload?: VectorPayload;
}

interface CollectionConfig {
	vectors: {
		size: number;
		distance: "Cosine" | "Euclid" | "Dot";
	};
	optimizers_config?: {
		default_segment_number?: number;
	};
	replication_factor?: number;
}

interface SearchOptions {
	vector: number[];
	limit?: number;
	filter?: Record<string, unknown>;
}

interface PayloadIndexOptions {
	field_name: string;
	field_schema: "keyword" | "integer" | "float" | "geo" | "text";
	wait?: boolean;
}

// 为混合搜索结果定义类型
interface SearchResultItem {
	id: string;
	score: number;
	payload: {
		text: string;
		[key: string]: unknown;
	};
	metadata: {
		source: "vector" | "keyword";
		originalScore?: number;
		vector_rank: number;
		keyword_rank: number;
		raw_rrf_score?: number;
	};
	rrf_score?: number;
}

export class QdrantService {
	private client: QdrantClient;

	constructor() {
		this.client = new QdrantClient({
			url: env.QDRANT_URL,
			apiKey: env.QDRANT_API_KEY,
		});
	}

	// Collection operations
	async listCollections() {
		const response = await this.client.getCollections();
		return response.collections;
	}

	async collectionExists(collectionName: string): Promise<boolean> {
		try {
			const response = await this.client.collectionExists(collectionName);
			return response.exists;
		} catch (error) {
			console.error(
				`Error checking collection existence ${collectionName}:`,
				error,
			);
			return false;
		}
	}

	async getCollection(collectionName: string) {
		try {
			return await this.client.getCollection(collectionName);
		} catch (error) {
			console.error(`Error getting collection ${collectionName}:`, error);
			throw error;
		}
	}

	async createCollection(collectionName: string, config: CollectionConfig) {
		try {
			return await this.client.createCollection(collectionName, config);
		} catch (error) {
			console.error(`Error creating collection ${collectionName}:`, error);
			throw error;
		}
	}

	async deleteCollection(collectionName: string) {
		try {
			return await this.client.deleteCollection(collectionName);
		} catch (error) {
			console.error(`Error deleting collection ${collectionName}:`, error);
			throw error;
		}
	}

	// Payload index operations
	async createPayloadIndex(
		collectionName: string,
		options: PayloadIndexOptions,
	) {
		try {
			return await this.client.createPayloadIndex(collectionName, options);
		} catch (error) {
			console.error(
				`Error creating payload index in ${collectionName}:`,
				error,
			);
			throw error;
		}
	}

	// Point operations
	async upsertPoints(collectionName: string, points: PointData[], wait = true) {
		try {
			return await this.client.upsert(collectionName, {
				wait,
				points,
			});
		} catch (error) {
			console.error(`Error upserting points to ${collectionName}:`, error);
			throw error;
		}
	}

	async deletePoints(
		collectionName: string,
		pointIdsOrFilter: (string | number)[] | { filter: Record<string, unknown> },
		wait = true,
	) {
		try {
			if (Array.isArray(pointIdsOrFilter)) {
				// Delete by point IDs
				return await this.client.delete(collectionName, {
					wait,
					points: pointIdsOrFilter,
				});
			}

			// Delete by filter
			return await this.client.delete(collectionName, {
				wait,
				filter: pointIdsOrFilter.filter,
			});
		} catch (error) {
			console.error(`Error deleting points from ${collectionName}:`, error);
			throw error;
		}
	}

	async retrievePoints(collectionName: string, pointIds: (string | number)[]) {
		try {
			return await this.client.retrieve(collectionName, {
				ids: pointIds,
			});
		} catch (error) {
			console.error(`Error retrieving points from ${collectionName}:`, error);
			throw error;
		}
	}

	// Search operations
	async search(collectionName: string, options: SearchOptions) {
		try {
			return await this.client.search(collectionName, options);
		} catch (error) {
			console.error(`Error searching in ${collectionName}:`, error);
			throw error;
		}
	}

	async searchWithFilter(
		collectionName: string,
		vector: number[],
		filter: Record<string, unknown>,
		limit = 10,
	) {
		try {
			return await this.client.search(collectionName, {
				vector,
				filter,
				limit,
			});
		} catch (error) {
			console.error(`Error searching with filter in ${collectionName}:`, error);
			throw error;
		}
	}

	async searchBatch(
		collectionName: string,
		searches: {
			vector: number[];
			limit: number;
			filter?: Record<string, unknown>;
		}[],
	) {
		try {
			return await this.client.searchBatch(collectionName, {
				searches,
			});
		} catch (error) {
			console.error(`Error batch searching in ${collectionName}:`, error);
			throw error;
		}
	}

	// 添加混合搜索方法，支持单知识库和多知识库场景
	/**
	 * 执行混合搜索 - 结合向量搜索和关键词搜索
	 * @param query 搜索查询
	 * @param kbIds 知识库ID或ID数组
	 * @param options 搜索选项
	 */
	async hybridSearch(
		query: string,
		kbIds: string | string[],
		options: {
			limit?: number;
			scoreNormalization?: "none" | "percentage" | "exponential";
			candidateMultiplier?: number;
			useShould?: boolean; // 是否使用should条件（多知识库）而非must（单知识库）
		} = {},
	) {
		try {
			// 设置默认选项
			const {
				limit = 10,
				scoreNormalization = "percentage",
				candidateMultiplier = 2,
				useShould = Array.isArray(kbIds) && kbIds.length > 1,
			} = options;

			// 确保kbIds始终是数组
			const kbIdArray = Array.isArray(kbIds) ? kbIds : [kbIds];

			// 计算候选结果数量
			const candidateLimit = limit * candidateMultiplier;

			// 1. 生成查询嵌入
			const { embedding } = await embed({
				model: cohere.embedding("embed-multilingual-v3.0"),
				value: query,
			});

			if (!embedding) {
				throw new Error("Failed to generate query embedding");
			}

			// 2. 执行混合搜索
			const allResults: SearchResultItem[] = [];

			// 准备kbId过滤条件
			const kbIdFilter = useShould
				? {
						should: kbIdArray.map((id) => ({
							key: "kbId",
							match: { value: id },
						})),
					}
				: {
						must: [
							{
								key: "kbId",
								match: { value: kbIdArray[0] },
							},
						],
					};

			// 2.1 向量搜索 - 语义相似度
			const vectorFilter = useShould
				? { ...kbIdFilter }
				: {
						must: [...(kbIdFilter.must || [])],
					};

			const vectorResults = await this.search("waha", {
				vector: embedding,
				limit: candidateLimit,
				filter: vectorFilter,
			});

			// 2.2 关键词搜索 - 精确匹配
			const keywordFilter = useShould
				? {
						must: [
							{
								key: "text",
								match: { text: query },
							},
						],
						should: kbIdFilter.should,
					}
				: {
						must: [
							...(kbIdFilter.must || []),
							{
								key: "text",
								match: { text: query },
							},
						],
					};

			const keywordResults = await this.search("waha", {
				vector: embedding,
				limit: candidateLimit,
				filter: keywordFilter,
			});

			// 3. 转换结果格式
			// 处理向量搜索结果
			if (vectorResults && vectorResults.length > 0) {
				const formattedResults = vectorResults.map((r) => ({
					id: String(r.id),
					score: r.score || 0,
					payload: r.payload as { text: string; [key: string]: unknown },
					metadata: {
						source: "vector" as const,
						originalScore: r.score,
						vector_rank: vectorResults.findIndex((vr) => vr.id === r.id),
						keyword_rank: -1,
					},
				}));

				allResults.push(...formattedResults);
			}

			// 处理关键词搜索结果
			if (keywordResults && keywordResults.length > 0) {
				// 添加新的结果，忽略已经在向量结果中的ID
				const existingIds = new Set(allResults.map((r) => r.id));

				for (const r of keywordResults) {
					const id = String(r.id);
					const keywordRank = keywordResults.findIndex((kr) => kr.id === r.id);

					// 如果ID已存在，只更新元数据
					if (existingIds.has(id)) {
						// 查找并更新已存在的结果
						for (const existingResult of allResults) {
							if (existingResult.id === id && existingResult.metadata) {
								existingResult.metadata.keyword_rank = keywordRank;
								break;
							}
						}
					} else {
						// 创建新的结果项
						allResults.push({
							id,
							score: r.score || 0,
							payload: r.payload as { text: string; [key: string]: unknown },
							metadata: {
								source: "keyword" as const,
								originalScore: r.score,
								vector_rank: -1,
								keyword_rank: keywordRank,
							},
						});
					}
				}
			}

			// 4. 应用Reciprocal Rank Fusion (RRF)来合并结果
			const idToResultMap = new Map();
			const k = 20; // RRF参数k

			// 处理向量搜索排名
			for (const result of allResults) {
				if (result.metadata.vector_rank >= 0) {
					const rrf_score = 1 / (k + result.metadata.vector_rank);

					if (!idToResultMap.has(result.id)) {
						idToResultMap.set(result.id, {
							...result,
							rrf_score,
						});
					} else {
						const existing = idToResultMap.get(result.id);
						existing.rrf_score = (existing.rrf_score || 0) + rrf_score;
					}
				}
			}

			// 处理关键词搜索排名
			for (const result of allResults) {
				if (result.metadata.keyword_rank >= 0) {
					const rrf_score = 1 / (k + result.metadata.keyword_rank);

					if (!idToResultMap.has(result.id)) {
						idToResultMap.set(result.id, {
							...result,
							rrf_score,
						});
					} else {
						const existing = idToResultMap.get(result.id);
						existing.rrf_score = (existing.rrf_score || 0) + rrf_score;
					}
				}
			}

			// 5. 排序并归一化
			let fusedResults = Array.from(idToResultMap.values()).sort(
				(a, b) => (b.rrf_score || 0) - (a.rrf_score || 0),
			);

			// 归一化分数
			if (fusedResults.length > 0) {
				const maxScore = fusedResults[0].rrf_score;
				const minScore = fusedResults[fusedResults.length - 1].rrf_score;
				const scoreRange = maxScore - minScore;

				fusedResults = fusedResults.map((result) => {
					let normalizedScore: number;

					switch (scoreNormalization) {
						case "percentage":
							// 百分比归一化 (0-1)
							normalizedScore =
								scoreRange > 0
									? (result.rrf_score - minScore) / scoreRange
									: 1.0;
							normalizedScore = Math.round(normalizedScore * 100) / 100;
							break;
						case "exponential":
							// 指数归一化
							normalizedScore = (result.rrf_score / maxScore) ** 0.5;
							normalizedScore = Math.round(normalizedScore * 100) / 100;
							break;
						default:
							normalizedScore = result.rrf_score;
					}

					return {
						...result,
						score: normalizedScore,
						metadata: {
							...result.metadata,
							raw_rrf_score: result.rrf_score,
						},
					};
				});
			}

			// 6. 返回最终结果
			return {
				results: fusedResults.slice(0, limit),
				fusionDetails: {
					totalResults: fusedResults.length,
					returnedResults: Math.min(fusedResults.length, limit),
					vectorResultsCount: vectorResults.length,
					keywordResultsCount: keywordResults.length,
					normalizationMethod: scoreNormalization,
					searchedKbs: kbIdArray,
				},
			};
		} catch (error) {
			console.error("Hybrid search error:", error);
			throw error;
		}
	}
}

export const qdrantService = new QdrantService();
