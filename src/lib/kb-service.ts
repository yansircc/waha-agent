import { mastra } from "@/mastra";
import { db } from "@/server/db";
import { documents, knowledgeBases } from "@/server/db/schema";
import type {
	CreateDocumentInput,
	CreateKnowledgeBaseInput,
	UpdateDocumentInput,
	UpdateKnowledgeBaseInput,
} from "@/types/kb";
import { cohere } from "@ai-sdk/cohere";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { and, eq } from "drizzle-orm";

/**
 * 知识库服务 - 处理知识库和文档的CRUD操作
 */
export const kbService = {
	// 知识库(Knowledge Base)操作
	knowledgeBases: {
		/**
		 * 创建新知识库
		 */
		create: async (params: CreateKnowledgeBaseInput) => {
			const { name, description, userId } = params;

			// Create knowledge base
			const [kb] = await db
				.insert(knowledgeBases)
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
			const kb = await db.query.knowledgeBases.findFirst({
				where: and(
					eq(knowledgeBases.id, id),
					eq(knowledgeBases.createdById, userId),
				),
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
			const kbs = await db.query.knowledgeBases.findMany({
				where: eq(knowledgeBases.createdById, userId),
				with: {
					documents: true,
				},
			});

			return kbs;
		},

		/**
		 * 更新知识库
		 */
		update: async (params: UpdateKnowledgeBaseInput) => {
			const { id, name, description, userId } = params;

			// Check if knowledge base exists and belongs to user
			const kb = await db.query.knowledgeBases.findFirst({
				where: and(
					eq(knowledgeBases.id, id),
					eq(knowledgeBases.createdById, userId),
				),
			});

			if (!kb) {
				throw new Error(
					"Knowledge base not found or you don't have permission",
				);
			}

			// Update knowledge base
			const [updatedKb] = await db
				.update(knowledgeBases)
				.set({
					name: name ?? kb.name,
					description: description ?? kb.description,
					updatedAt: new Date(),
				})
				.where(eq(knowledgeBases.id, id))
				.returning();

			return updatedKb;
		},

		/**
		 * 删除知识库及其关联的向量存储数据
		 */
		delete: async (id: string, userId: string) => {
			// Check if knowledge base exists and belongs to user
			const kb = await db.query.knowledgeBases.findFirst({
				where: and(
					eq(knowledgeBases.id, id),
					eq(knowledgeBases.createdById, userId),
				),
			});

			if (!kb) {
				throw new Error(
					"Knowledge base not found or you don't have permission",
				);
			}

			// Get the vector store instance from Mastra
			const vectorStore = mastra.getVector("pgVector");
			const indexName = "kb_vectors";

			try {
				// Query获取与知识库关联的向量（添加userId进行精确筛选）
				const matchingVectors = await vectorStore.query({
					indexName,
					queryVector: Array(1024).fill(0), // 临时查询向量
					topK: 1000, // 获取足够多的结果
					filter: {
						knowledgeBaseId: id,
						userId: userId,
					},
					includeVector: false,
				});

				// 如果有匹配的向量, 逐个删除
				if (matchingVectors && matchingVectors.length > 0) {
					console.log(
						`Found ${matchingVectors.length} vectors to delete for knowledge base: ${id}`,
					);

					for (const vector of matchingVectors) {
						if (vector.id) {
							await vectorStore.deleteIndexById(indexName, vector.id);
						}
					}

					console.log(
						`Deleted ${matchingVectors.length} vectors for knowledge base: ${id}`,
					);
				} else {
					console.log(`No vectors found for knowledge base: ${id}`);
				}
			} catch (error) {
				console.error(
					`Failed to delete vectors for knowledge base ${id}:`,
					error,
				);
				// 继续执行，不阻止知识库的删除
			}

			// Delete knowledge base (cascades to documents)
			await db.delete(knowledgeBases).where(eq(knowledgeBases.id, id));

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
				knowledgeBaseId,
				userId,
			} = params;

			// Check if knowledge base exists and belongs to user
			const kb = await db.query.knowledgeBases.findFirst({
				where: and(
					eq(knowledgeBases.id, knowledgeBaseId),
					eq(knowledgeBases.createdById, userId),
				),
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
					knowledgeBaseId,
				})
				.returning();

			if (!doc) {
				throw new Error("Failed to create document");
			}

			// Now process document content for embedding with the correct document ID
			await processDocumentContent(
				content,
				knowledgeBaseId,
				name,
				userId,
				doc.id,
			);

			return doc;
		},

		/**
		 * 根据ID获取文档
		 */
		getById: async (id: string, userId: string) => {
			const doc = await db.query.documents.findFirst({
				where: eq(documents.id, id),
				with: {
					knowledgeBase: true,
				},
			});

			if (!doc || doc.knowledgeBase.createdById !== userId) {
				throw new Error("Document not found or you don't have permission");
			}

			return doc;
		},

		/**
		 * 获取知识库中的所有文档
		 */
		getByKnowledgeBaseId: async (knowledgeBaseId: string, userId: string) => {
			// Check if knowledge base exists and belongs to user
			const kb = await db.query.knowledgeBases.findFirst({
				where: and(
					eq(knowledgeBases.id, knowledgeBaseId),
					eq(knowledgeBases.createdById, userId),
				),
			});

			if (!kb) {
				throw new Error(
					"Knowledge base not found or you don't have permission",
				);
			}

			const docs = await db.query.documents.findMany({
				where: eq(documents.knowledgeBaseId, knowledgeBaseId),
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
					knowledgeBase: true,
				},
			});

			if (!doc || doc.knowledgeBase.createdById !== userId) {
				throw new Error("Document not found or you don't have permission");
			}

			// If content is being updated, process it for embedding
			if (content && content !== doc.content) {
				await processDocumentContent(
					content,
					doc.knowledgeBaseId,
					name || doc.name,
					userId,
					doc.id,
				);
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
					knowledgeBase: true,
				},
			});

			if (!doc || doc.knowledgeBase.createdById !== userId) {
				throw new Error("Document not found or you don't have permission");
			}

			// Delete document
			await db.delete(documents).where(eq(documents.id, id));

			// 获取向量存储实例
			const vectorStore = mastra.getVector("pgVector");
			const indexName = "kb_vectors";

			try {
				// 查询匹配该文档的向量（使用documentId和userId进行精确筛选）
				const matchingVectors = await vectorStore.query({
					indexName,
					queryVector: Array(1024).fill(0), // 临时查询向量
					topK: 1000, // 获取足够多的结果
					filter: {
						documentId: id,
						userId: userId,
					},
					includeVector: false,
				});

				// 如果有匹配的向量, 逐个删除
				if (matchingVectors && matchingVectors.length > 0) {
					console.log(
						`Found ${matchingVectors.length} vectors to delete for document: ${doc.name} (ID: ${id})`,
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
					console.log(`No vectors found for document: ${doc.name} (ID: ${id})`);
				}
			} catch (error) {
				console.error(
					`Failed to delete vectors for document ${doc.name}:`,
					error,
				);
				// 继续处理, 不阻止文档删除
			}

			return { success: true };
		},
	},
};

/**
 * 处理文档内容并存储嵌入向量
 *
 * @private
 */
async function processDocumentContent(
	content: string,
	knowledgeBaseId: string,
	documentName: string,
	userId: string,
	documentId: string,
) {
	// Create document and chunk it
	const doc = MDocument.fromText(content);
	const chunks = await doc.chunk({
		strategy: "recursive",
		size: 512,
		overlap: 50,
		separator: "\n",
	});

	// Embed all chunks at once
	const { embeddings: allEmbeddings } = await embedMany({
		model: cohere.embedding("embed-multilingual-v3.0"),
		values: chunks.map((chunk) => chunk.text),
	});

	// Get the vector store instance from Mastra
	const vectorStore = mastra.getVector("pgVector");

	// 使用单一表存储所有知识库的向量数据
	const indexName = "kb_vectors";

	// 创建索引（如果不存在）
	try {
		await vectorStore.createIndex({
			indexName,
			dimension: 1024,
		});
	} catch (error) {
		// 索引可能已存在，这是正常的
		console.log("Index may already exist:", error);
	}

	// 使用丰富的元数据存储所有嵌入，包括知识库ID作为过滤条件
	await vectorStore.upsert({
		indexName,
		vectors: allEmbeddings,
		metadata: chunks.map((chunk) => ({
			text: chunk.text,
			source: documentName,
			knowledgeBaseId: knowledgeBaseId,
			userId: userId,
			documentId: documentId,
			chunkIndex: chunks.indexOf(chunk),
			timestamp: new Date().toISOString(),
		})),
	});

	return chunks.length;
}
