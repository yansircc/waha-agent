import { getRecentDocumentUpdates } from "@/lib/document-updates";
import { documents } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

/**
 * 文档相关的tRPC路由
 */
export const documentsRouter = createTRPCRouter({
	/**
	 * 获取文档状态更新
	 * 用于前端轮询检查文档的向量化状态变化
	 */
	getDocumentUpdates: protectedProcedure
		.input(
			z.object({
				documentIds: z.array(z.string()),
				since: z.number().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { documentIds, since = 0 } = input;

			if (!documentIds.length) {
				return {
					success: true,
					updates: [],
					timestamp: Date.now(),
				};
			}

			try {
				// 首先检查内存中的最近更新
				const recentUpdates = getRecentDocumentUpdates().filter((update) =>
					documentIds.includes(update.documentId),
				);

				// 如果所有请求的文档都有最近的更新，直接返回
				if (recentUpdates.length === documentIds.length) {
					return {
						success: true,
						updates: recentUpdates,
						timestamp: Date.now(),
					};
				}

				// 对于没有最近更新的文档，从数据库获取
				const documentsToFetch = documentIds.filter(
					(id) => !recentUpdates.some((update) => update.documentId === id),
				);

				if (documentsToFetch.length > 0) {
					const dbDocuments = await ctx.db.query.documents.findMany({
						where: inArray(documents.id, documentsToFetch),
						columns: {
							id: true,
							kbId: true,
							vectorizationStatus: true,
							updatedAt: true,
						},
					});

					// 将数据库文档格式化为更新
					const dbUpdates = dbDocuments.map((doc) => ({
						documentId: doc.id,
						kbId: doc.kbId,
						status: doc.vectorizationStatus || "pending",
						timestamp: doc.updatedAt?.getTime() || Date.now(),
					}));

					// 合并内存和数据库更新
					const allUpdates = [...recentUpdates, ...dbUpdates];

					return {
						success: true,
						updates: allUpdates,
						timestamp: Date.now(),
					};
				}

				return {
					success: true,
					updates: recentUpdates,
					timestamp: Date.now(),
				};
			} catch (error) {
				console.error("Error fetching document updates:", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch document updates",
					cause: error,
				});
			}
		}),
});
