import { triggerDocumentProcessing } from "@/lib/trigger-helpers";
import { mastra } from "@/mastra";
import { db } from "@/server/db";
import { documents, kbs } from "@/server/db/schema";
import type {
	CreateDocumentInput,
	CreateKbInput,
	UpdateDocumentInput,
	UpdateKbInput,
} from "@/types/kb";
import { and, eq } from "drizzle-orm";

/**
 * 知识库服务 - 处理知识库和文档的CRUD操作
 */
export const kbService = {
	// 知识库(Knowledge Base)操作
	kbs: {
		/**
		 * 创建新知识库
		 */
		create: async (params: CreateKbInput) => {
			const { name, description, userId } = params;

			// Create knowledge base
			const [kb] = await db
				.insert(kbs)
				.values({
					name,
					description,
					content: "", // Empty content, will be managed through documents
					createdById: userId,
				})
				.returning();

			return kb;
		},

		/**
		 * 根据ID获取知识库
		 */
		getById: async (id: string, userId: string) => {
			const kb = await db.query.kbs.findFirst({
				where: and(eq(kbs.id, id), eq(kbs.createdById, userId)),
				with: {
					documents: true,
				},
			});

			return kb;
		},

		/**
		 * 获取用户的所有知识库
		 */
		getByUserId: async (userId: string) => {
			const _kbs = await db.query.kbs.findMany({
				where: eq(kbs.createdById, userId),
				with: {
					documents: true,
				},
			});

			return _kbs;
		},

		/**
		 * 更新知识库
		 */
		update: async (params: UpdateKbInput) => {
			const { id, name, description, userId } = params;

			// Check if knowledge base exists and belongs to user
			const kb = await db.query.kbs.findFirst({
				where: and(eq(kbs.id, id), eq(kbs.createdById, userId)),
			});

			if (!kb) {
				throw new Error(
					"Knowledge base not found or you don't have permission",
				);
			}

			// Update knowledge base
			const [updatedKb] = await db
				.update(kbs)
				.set({
					name: name ?? kb.name,
					description: description ?? kb.description,
					updatedAt: new Date(),
				})
				.where(eq(kbs.id, id))
				.returning();

			return updatedKb;
		},

		/**
		 * 删除知识库及其关联的向量存储数据
		 */
		delete: async (id: string, userId: string) => {
			// Check if knowledge base exists and belongs to user
			const kb = await db.query.kbs.findFirst({
				where: and(eq(kbs.id, id), eq(kbs.createdById, userId)),
			});

			if (!kb) {
				throw new Error(
					"Knowledge base not found or you don't have permission",
				);
			}

			try {
				// 获取向量存储实例
				const vectorStore = mastra.getVector("pgVector");
				const indexName = "wm_kb_vectors";

				// 查询匹配该知识库的向量
				const matchingVectors = await vectorStore.query({
					indexName,
					queryVector: Array(1024).fill(0), // 临时查询向量
					topK: 1000, // 获取足够多的结果
					filter: {
						kbId: id,
						userId,
					},
					includeVector: false,
				});

				// 删除匹配的向量
				if (matchingVectors && matchingVectors.length > 0) {
					console.log(
						`Found ${matchingVectors.length} vectors to delete for knowledge base: ${kb.name}`,
					);

					for (const vector of matchingVectors) {
						if (vector.id) {
							await vectorStore.deleteIndexById(indexName, vector.id);
						}
					}

					console.log(
						`Deleted ${matchingVectors.length} vectors for knowledge base: ${kb.name}`,
					);
				} else {
					console.log(`No vectors found for knowledge base: ${kb.name}`);
				}
			} catch (error) {
				console.error(
					`Failed to delete vectors for knowledge base ${kb.name}:`,
					error,
				);
				// 继续执行，不阻止知识库的删除
			}

			// Delete knowledge base (cascades to documents)
			await db.delete(kbs).where(eq(kbs.id, id));

			return { success: true };
		},
	},

	// 文档(Document)操作
	documents: {
		/**
		 * 创建新文档
		 */
		create: async (params: CreateDocumentInput) => {
			const {
				name,
				content,
				fileUrl,
				fileType,
				fileSize,
				metadata,
				kbId,
				userId,
			} = params;

			// Check if knowledge base exists and belongs to user
			const kb = await db.query.kbs.findFirst({
				where: and(eq(kbs.id, kbId), eq(kbs.createdById, userId)),
			});

			if (!kb) {
				throw new Error(
					"Knowledge base not found or you don't have permission",
				);
			}

			// Create document first to get the ID
			const [doc] = await db
				.insert(documents)
				.values({
					name,
					content,
					fileUrl,
					fileType,
					fileSize,
					metadata,
					kbId,
				})
				.returning();

			if (!doc) {
				throw new Error("Failed to create document");
			}

			// 可选的webhook URL - 用于接收处理状态的通知
			const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/embedding`;

			// 触发文档处理任务
			// 现在文档嵌入将直接存储在数据库中，webhookUrl仅用于通知
			await triggerDocumentProcessing({
				content,
				kbId,
				documentName: name,
				userId,
				documentId: doc.id,
				webhookUrl, // 可选的webhook通知
			});

			return doc;
		},

		/**
		 * 根据ID获取文档
		 */
		getById: async (id: string, userId: string) => {
			const doc = await db.query.documents.findFirst({
				where: eq(documents.id, id),
				with: {
					kb: true,
				},
			});

			if (!doc || doc.kb.createdById !== userId) {
				throw new Error("Document not found or you don't have permission");
			}

			return doc;
		},

		/**
		 * 获取知识库中的所有文档
		 */
		getByKbId: async (kbId: string, userId: string) => {
			// Check if knowledge base exists and belongs to user
			const kb = await db.query.kbs.findFirst({
				where: and(eq(kbs.id, kbId), eq(kbs.createdById, userId)),
			});

			if (!kb) {
				throw new Error(
					"Knowledge base not found or you don't have permission",
				);
			}

			const docs = await db.query.documents.findMany({
				where: eq(documents.kbId, kbId),
			});

			return docs;
		},

		/**
		 * 更新文档
		 */
		update: async (params: UpdateDocumentInput) => {
			const {
				id,
				name,
				content,
				fileUrl,
				fileType,
				fileSize,
				metadata,
				userId,
			} = params;

			// Get the document with knowledge base
			const doc = await db.query.documents.findFirst({
				where: eq(documents.id, id),
				with: {
					kb: true,
				},
			});

			if (!doc || doc.kb.createdById !== userId) {
				throw new Error("Document not found or you don't have permission");
			}

			// If content is being updated, trigger the document processing task
			if (content && content !== doc.content) {
				// 可选的webhook URL
				const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/embedding`;

				// 触发文档处理 - 现在直接存储到数据库
				await triggerDocumentProcessing({
					content,
					kbId: doc.kbId,
					documentName: name || doc.name,
					userId,
					documentId: doc.id,
					webhookUrl, // 可选的webhook通知
				});
			}

			// Update document
			const [updatedDoc] = await db
				.update(documents)
				.set({
					name: name ?? doc.name,
					content: content ?? doc.content,
					fileUrl: fileUrl ?? doc.fileUrl,
					fileType: fileType ?? doc.fileType,
					fileSize: fileSize ?? doc.fileSize,
					metadata: metadata ?? doc.metadata,
					updatedAt: new Date(),
				})
				.where(eq(documents.id, id))
				.returning();

			return updatedDoc;
		},

		/**
		 * 删除文档及其关联的向量存储数据
		 */
		delete: async (id: string, userId: string) => {
			// Get the document with knowledge base
			const doc = await db.query.documents.findFirst({
				where: eq(documents.id, id),
				with: {
					kb: true,
				},
			});

			if (!doc || doc.kb.createdById !== userId) {
				throw new Error("Document not found or you don't have permission");
			}

			try {
				// 获取向量存储实例
				const vectorStore = mastra.getVector("pgVector");
				const indexName = "wm_kb_vectors";

				// 查询匹配该文档的向量
				const matchingVectors = await vectorStore.query({
					indexName,
					queryVector: Array(1024).fill(0), // 临时查询向量
					topK: 1000, // 获取足够多的结果
					filter: {
						documentId: id,
						userId,
					},
					includeVector: false,
				});

				// 删除匹配的向量
				if (matchingVectors && matchingVectors.length > 0) {
					console.log(
						`Found ${matchingVectors.length} vectors to delete for document: ${doc.name}`,
					);

					for (const vector of matchingVectors) {
						if (vector.id) {
							await vectorStore.deleteIndexById(indexName, vector.id);
						}
					}

					console.log(
						`Deleted ${matchingVectors.length} vectors for document: ${doc.name}`,
					);
				} else {
					console.log(`No vectors found for document: ${doc.name}`);
				}
			} catch (error) {
				console.error(
					`Failed to delete vectors for document ${doc.name}:`,
					error,
				);
				// 继续处理，不阻止文档删除
			}

			// Delete document
			await db.delete(documents).where(eq(documents.id, id));

			return { success: true };
		},
	},
};

// No longer needed as it's now handled by the Trigger.dev task
// async function processDocumentContent() { ... }
