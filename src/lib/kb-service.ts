import path from "node:path";
import { kbLogger as logger } from "@/lib/logger";
import { deleteFile, getPresignedUrl, uploadFile } from "@/lib/s3-service";
import { db } from "@/server/db";
import { documents, kbs } from "@/server/db/schema";
import type {
	CreateDocumentInput,
	CreateKbInput,
	UpdateDocumentInput,
	UpdateKbInput,
} from "@/types/kb";
import { and, eq } from "drizzle-orm";

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
	TEXT: 4 * 1024 * 1024, // 4MB for text/markdown files
	OTHER: 2 * 1024 * 1024, // 2MB for other file types
};

// Text file types
const TEXT_FILE_TYPES = ["text/plain", "text/markdown", "application/markdown"];

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
		 * 删除知识库及其关联的文档
		 */
		delete: async (id: string, userId: string) => {
			// Check if knowledge base exists and belongs to user
			const kb = await db.query.kbs.findFirst({
				where: and(eq(kbs.id, id), eq(kbs.createdById, userId)),
				with: {
					documents: true,
				},
			});

			if (!kb) {
				throw new Error(
					"Knowledge base not found or you don't have permission",
				);
			}

			// Delete files from R2 storage
			if (kb.documents?.length) {
				for (const doc of kb.documents) {
					if (doc.filePath) {
						try {
							await deleteFile(doc.filePath);
						} catch (error) {
							logger.error(`Failed to delete file: ${doc.filePath}`, error);
							// Continue with deletion even if file deletion fails
						}
					}
				}
			}

			// Delete knowledge base (cascades to documents in the database)
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
				file, // Optional File object
				fileUrl: providedFileUrl, // Renamed to avoid conflict
				filePath: providedFilePath, // Renamed to avoid conflict
				fileType: providedFileType,
				fileSize: providedFileSize,
				mimeType: providedMimeType,
				metadata,
				kbId,
				userId,
				isText: providedIsText,
				preserveOriginal, // 控制是否保留原始文件
			} = params;

			logger.info("Creating document with params:", {
				name,
				kbId,
				providedFilePath,
				hasFile: !!file,
				preserveOriginal, // 记录是否保留原始文件
			});

			// Check if knowledge base exists and belongs to user
			const kb = await db.query.kbs.findFirst({
				where: and(eq(kbs.id, kbId), eq(kbs.createdById, userId)),
			});

			if (!kb) {
				throw new Error(
					"Knowledge base not found or you don't have permission",
				);
			}

			// Initialize file-related variables with provided values
			let filePath = providedFilePath || "";
			let fileUrl = providedFileUrl || "";
			let fileType = providedFileType || null;
			let fileSize = providedFileSize || null;
			let mimeType = providedMimeType || null;
			let isTextFile = providedIsText === undefined ? true : providedIsText;

			// Only handle file upload if file is provided and no filePath exists
			if (file && !providedFilePath) {
				// Check file size limits
				const isFileTextType = TEXT_FILE_TYPES.includes(file.type);
				const sizeLimit = isFileTextType
					? FILE_SIZE_LIMITS.TEXT
					: FILE_SIZE_LIMITS.OTHER;

				if (file.size > sizeLimit) {
					throw new Error(
						`File size exceeds the limit of ${isFileTextType ? "4MB" : "2MB"}`,
					);
				}

				// Create safe filename using original name and timestamp
				const fileExt = path.extname(file.name);
				const safeFileName = `${Date.now()}-${(name || file.name).replace(/[^a-z0-9]/gi, "_").toLowerCase()}${fileExt}`;

				// Create R2 storage path: userId/kbId/filename
				filePath = `${userId}/${kbId}/${safeFileName}`;

				// Upload file to R2
				await uploadFile(filePath, await file.arrayBuffer(), file.type);

				// Generate a URL for accessing the file (presigned URL)
				fileUrl = await getPresignedUrl(filePath, 60 * 60 * 24 * 7); // 7-day expiry

				// Set file metadata
				fileType = file.type;
				fileSize = file.size;
				mimeType = file.type;
				isTextFile = TEXT_FILE_TYPES.includes(file.type);
			}

			logger.info("Creating document with final filePath:", filePath);

			// Create document in database
			const [doc] = await db
				.insert(documents)
				.values({
					name,
					content: content || null,
					fileUrl,
					filePath,
					fileType,
					fileSize,
					mimeType,
					isText: isTextFile,
					metadata,
					kbId,
					vectorizationStatus: "pending",
				})
				.returning();

			if (!doc) {
				throw new Error("Failed to create document");
			}

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

			// If the document has a file and the URL has expired, generate a new one
			if (doc.filePath) {
				doc.fileUrl = await getPresignedUrl(doc.filePath, 60 * 60 * 24); // 1-day expiry
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

			// Generate fresh presigned URLs for all documents
			for (const doc of docs) {
				if (doc.filePath) {
					doc.fileUrl = await getPresignedUrl(doc.filePath, 60 * 60 * 24); // 1-day expiry
				}
			}

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
				file,
				fileUrl: providedFileUrl,
				filePath: providedFilePath,
				fileType: providedFileType,
				fileSize: providedFileSize,
				mimeType: providedMimeType,
				metadata,
				kbId,
				userId,
				isText: providedIsText,
				vectorizationStatus,
			} = params;

			logger.info("Updating document with params:", {
				id,
				name,
				providedFilePath,
				hasFile: !!file,
			});

			// Check if document exists and belongs to user's kb
			const doc = await db.query.documents.findFirst({
				where: eq(documents.id, id),
				with: {
					kb: true,
				},
			});

			if (!doc || doc.kb.createdById !== userId) {
				throw new Error("Document not found or you don't have permission");
			}

			// Initialize with provided values or existing ones
			let filePath = providedFilePath || doc.filePath || "";
			let fileUrl = providedFileUrl || doc.fileUrl || "";
			let fileType = providedFileType || doc.fileType || null;
			let fileSize = providedFileSize || doc.fileSize || null;
			let mimeType = providedMimeType || doc.mimeType || null;
			let isTextFile =
				providedIsText === undefined ? doc.isText || true : providedIsText;

			// Only process file if provided and there's no explicitly provided filePath
			if (file && !providedFilePath) {
				// Check file size limits
				const isFileTextType = TEXT_FILE_TYPES.includes(file.type);
				const sizeLimit = isFileTextType
					? FILE_SIZE_LIMITS.TEXT
					: FILE_SIZE_LIMITS.OTHER;

				if (file.size > sizeLimit) {
					throw new Error(
						`File size exceeds the limit of ${isFileTextType ? "4MB" : "2MB"}`,
					);
				}

				// Delete old file if exists
				if (doc.filePath) {
					try {
						logger.info("[KB-SERVICE] Deleting old file:", doc.filePath);
						await deleteFile(doc.filePath);
					} catch (error) {
						logger.error("[KB-SERVICE] Error deleting old file:", error);
						// Continue even if file deletion fails
					}
				}

				// Create safe filename using original name and timestamp
				const fileExt = path.extname(file.name);
				const safeFileName = `${Date.now()}-${(name || file.name).replace(/[^a-z0-9]/gi, "_").toLowerCase()}${fileExt}`;

				// Create R2 storage path: userId/kbId/filename
				filePath = `${userId}/${kbId}/${safeFileName}`;
				logger.info("[KB-SERVICE] New file path:", filePath);

				// Upload file to R2
				await uploadFile(filePath, await file.arrayBuffer(), file.type);

				// Generate a URL for accessing the file (presigned URL)
				fileUrl = await getPresignedUrl(filePath, 60 * 60 * 24 * 7); // 7-day expiry

				// Update file metadata
				fileType = file.type;
				fileSize = file.size;
				mimeType = file.type;
				isTextFile = TEXT_FILE_TYPES.includes(file.type);
			}

			logger.info(
				"[KB-SERVICE] Updating document with final filePath:",
				filePath,
			);

			// Update document in database
			const [updatedDoc] = await db
				.update(documents)
				.set({
					name: name === undefined ? doc.name : name,
					content: content === undefined ? doc.content : content,
					fileUrl,
					filePath,
					fileType,
					fileSize,
					mimeType,
					isText: isTextFile,
					metadata: metadata || doc.metadata,
					vectorizationStatus: vectorizationStatus || doc.vectorizationStatus,
					updatedAt: new Date(),
				})
				.where(eq(documents.id, id))
				.returning();

			if (!updatedDoc) {
				throw new Error("Failed to update document");
			}

			return updatedDoc;
		},

		/**
		 * 删除文档及其关联的文件
		 */
		delete: async (id: string, userId: string) => {
			try {
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

				logger.info(`Deleting document: id=${id}, name=${doc.name}`);

				// Delete file from R2 if filePath exists
				if (doc.filePath) {
					try {
						logger.info(`Deleting file from R2: ${doc.filePath}`);
						await deleteFile(doc.filePath);
						logger.info(`R2 file deleted successfully: ${doc.filePath}`);
					} catch (fileError) {
						logger.error("Failed to delete file from R2:", fileError);
						logger.info(
							"No filePath associated with document, skipping file deletion",
						);
						// Continue with database deletion even if file deletion fails
					}
				} else {
					logger.info(
						"No filePath associated with document, skipping file deletion",
					);
				}

				// Delete document from database
				logger.info(`Deleting document from database: ${id}`);
				await db.delete(documents).where(eq(documents.id, id));
				logger.info(`Document deleted successfully from database: ${id}`);

				return { success: true };
			} catch (error) {
				logger.error("Error deleting document:", error);
				throw error;
			}
		},
	},
};

// No longer needed as it's now handled by the Trigger.dev task
// async function processDocumentContent() { ... }
