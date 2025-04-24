import { qdrantService } from "@/lib/qdrant-service";
import { cohere } from "@ai-sdk/cohere";
import { embed } from "ai";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// 定义类型以消除any
interface SearchResult {
	id: string;
	score: number;
	payload: {
		text: string;
		[key: string]: unknown;
	};
	metadata: {
		raw_rrf_score?: number;
		source: "vector" | "keyword";
		vector_rank: number;
		keyword_rank: number;
		originalScore?: number;
	};
}

interface FusionResult {
	id: string;
	score: number;
	payload: {
		text: string;
		[key: string]: unknown;
	};
	metadata: {
		raw_rrf_score?: number;
		source: "vector" | "keyword";
		vector_rank: number;
		keyword_rank: number;
	};
}

// 定义规范化方法的类型
type NormalizationMethod = "none" | "percentage" | "exponential";

const pointDataSchema = z.object({
	id: z.union([z.string(), z.number()]),
	vector: z.array(z.number()),
	payload: z.record(z.unknown()).optional(),
});

const collectionConfigSchema = z.object({
	vectors: z.object({
		size: z.number(),
		distance: z.enum(["Cosine", "Euclid", "Dot"]),
	}),
	optimizers_config: z
		.object({
			default_segment_number: z.number().optional(),
		})
		.optional(),
	replication_factor: z.number().optional(),
});

const payloadIndexSchema = z.object({
	field_name: z.string(),
	field_schema: z.enum(["keyword", "integer", "float", "geo", "text"]),
	wait: z.boolean().optional(),
});

// 搜索选项的Zod模式
const searchOptionsSchema = z.object({
	query: z.string(),
	kbId: z.string(),
	limit: z.number().optional().default(10),
	scoreNormalization: z
		.enum(["none", "percentage", "exponential"])
		.optional()
		.default("percentage"),
	candidateMultiplier: z.number().optional().default(2),
});

export const qdrantRouter = createTRPCRouter({
	// Collection operations
	listCollections: protectedProcedure.query(async () => {
		return await qdrantService.listCollections();
	}),

	getCollection: protectedProcedure
		.input(z.object({ collectionName: z.string() }))
		.query(async ({ input }) => {
			return await qdrantService.getCollection(input.collectionName);
		}),

	createCollection: protectedProcedure
		.input(
			z.object({
				collectionName: z.string(),
				config: collectionConfigSchema,
			}),
		)
		.mutation(async ({ input }) => {
			return await qdrantService.createCollection(
				input.collectionName,
				input.config,
			);
		}),

	deleteCollection: protectedProcedure
		.input(z.object({ collectionName: z.string() }))
		.mutation(async ({ input }) => {
			return await qdrantService.deleteCollection(input.collectionName);
		}),

	// Payload index operations
	createPayloadIndex: protectedProcedure
		.input(
			z.object({
				collectionName: z.string(),
				options: payloadIndexSchema,
			}),
		)
		.mutation(async ({ input }) => {
			return await qdrantService.createPayloadIndex(
				input.collectionName,
				input.options,
			);
		}),

	// Points operations
	upsertPoints: protectedProcedure
		.input(
			z.object({
				collectionName: z.string(),
				points: z.array(pointDataSchema),
				wait: z.boolean().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			return await qdrantService.upsertPoints(
				input.collectionName,
				input.points,
				input.wait,
			);
		}),

	deletePoints: protectedProcedure
		.input(
			z.object({
				collectionName: z.string(),
				pointIds: z.array(z.union([z.string(), z.number()])),
				wait: z.boolean().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			return await qdrantService.deletePoints(
				input.collectionName,
				input.pointIds,
				input.wait,
			);
		}),

	deletePointsByDocumentId: protectedProcedure
		.input(
			z.object({
				collectionName: z.string(),
				documentId: z.string(),
				wait: z.boolean().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			// Create a filter that matches points with this document ID
			const filter = {
				filter: {
					must: [
						{
							key: "documentId",
							match: {
								value: input.documentId,
							},
						},
					],
				},
			};

			return await qdrantService.deletePoints(
				input.collectionName,
				filter,
				input.wait,
			);
		}),

	retrievePoints: protectedProcedure
		.input(
			z.object({
				collectionName: z.string(),
				pointIds: z.array(z.union([z.string(), z.number()])),
			}),
		)
		.query(async ({ input }) => {
			return await qdrantService.retrievePoints(
				input.collectionName,
				input.pointIds,
			);
		}),

	// Search operations
	search: protectedProcedure
		.input(
			z.object({
				collectionName: z.string(),
				vector: z.array(z.number()),
				limit: z.number().optional(),
				filter: z.record(z.unknown()).optional(),
			}),
		)
		.query(async ({ input }) => {
			return await qdrantService.search(input.collectionName, {
				vector: input.vector,
				limit: input.limit,
				filter: input.filter,
			});
		}),

	searchWithFilter: protectedProcedure
		.input(
			z.object({
				collectionName: z.string(),
				vector: z.array(z.number()),
				filter: z.record(z.unknown()),
				limit: z.number().optional(),
			}),
		)
		.query(async ({ input }) => {
			return await qdrantService.searchWithFilter(
				input.collectionName,
				input.vector,
				input.filter,
				input.limit,
			);
		}),

	searchBatch: protectedProcedure
		.input(
			z.object({
				collectionName: z.string(),
				searches: z.array(
					z.object({
						vector: z.array(z.number()),
						limit: z.number(),
						filter: z.record(z.unknown()).optional(),
					}),
				),
			}),
		)
		.query(async ({ input }) => {
			return await qdrantService.searchBatch(
				input.collectionName,
				input.searches,
			);
		}),

	// KB 混合搜索 - 使用通用hybridSearch方法
	kbSearch: protectedProcedure
		.input(searchOptionsSchema)
		.mutation(async ({ input }) => {
			try {
				// 调用通用hybridSearch方法，传入单个知识库ID
				return await qdrantService.hybridSearch(input.query, input.kbId, {
					limit: input.limit,
					scoreNormalization: input.scoreNormalization,
					candidateMultiplier: input.candidateMultiplier,
					useShould: false, // 单知识库模式
				});
			} catch (error) {
				console.error("KB search error:", error);
				throw error;
			}
		}),
});
