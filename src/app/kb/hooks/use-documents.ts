"use client";

import { env } from "@/env";
import { QDRANT_COLLECTION_NAME } from "@/lib/constants";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useS3Upload } from "./use-s3-upload";

interface UseDocumentsProps {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

interface DocumentResult {
	id: string;
	kbId: string;
	name: string;
	fileUrl: string | null;
	filePath: string | null;
	fileType: string | null;
	fileSize: number | null;
	mimeType: string | null;
	vectorizationStatus: string;
	createdAt: Date;
	updatedAt: Date | null;
	content?: string | null;
	metadata?: unknown;
	isText?: boolean | null;
}

export function useDocuments({ onSuccess, onError }: UseDocumentsProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
		{},
	);
	const utils = api.useUtils();
	const pollingRef = useRef<NodeJS.Timeout | null>(null);
	const processingDocumentsRef = useRef(new Set<string>());

	// Use the centralized S3 upload hook
	const { upload } = useS3Upload();

	// Get documents by knowledge base ID
	const getDocumentsByKbId = (kbId: string | undefined) => {
		return api.kbs.getDocuments.useQuery(
			{ kbId: kbId || "" },
			{ enabled: !!kbId },
		);
	};

	// Poll for document status updates
	const startPolling = useCallback(
		(documentIds: string[]) => {
			// Clear any existing polling
			if (pollingRef.current) {
				clearInterval(pollingRef.current);
			}

			if (documentIds.length === 0) return;

			// Track the processing documents
			for (const id of documentIds) {
				processingDocumentsRef.current.add(id);
			}

			// Start polling
			pollingRef.current = setInterval(async () => {
				try {
					// Only poll if we have processing documents
					if (processingDocumentsRef.current.size === 0) {
						if (pollingRef.current) {
							clearInterval(pollingRef.current);
							pollingRef.current = null;
						}
						return;
					}

					const response = await fetch(
						`/api/document-updates?documentIds=${Array.from(processingDocumentsRef.current).join(",")}`,
					);

					if (!response.ok) {
						console.error("获取文档更新失败:", response.statusText);
						return;
					}

					const data = await response.json();

					if (data.success && data.documents) {
						let shouldRefresh = false;

						// Check if any document has changed from processing status
						for (const doc of data.documents) {
							if (doc.status !== "processing") {
								processingDocumentsRef.current.delete(doc.documentId);
								shouldRefresh = true;
							}
						}

						// If any document status changed, invalidate queries to refresh UI
						if (shouldRefresh) {
							// Invalidate all document queries
							for (const doc of data.documents) {
								if (doc.kbId) {
									await utils.kbs.getDocuments.invalidate({ kbId: doc.kbId });
								}
							}

							// If there are no more processing documents, stop polling
							if (processingDocumentsRef.current.size === 0) {
								if (pollingRef.current) {
									clearInterval(pollingRef.current);
									pollingRef.current = null;
								}
							}
						}
					}
				} catch (error) {
					console.error("获取文档更新失败:", error);
				}
			}, 3000); // 每3秒轮询一次
		},
		[utils.kbs.getDocuments],
	);

	// Clean up polling on unmount
	useEffect(() => {
		return () => {
			if (pollingRef.current) {
				clearInterval(pollingRef.current);
			}
		};
	}, []);

	// Get document by ID
	const getDocumentById = (id: string) => {
		return api.kbs.getDocumentById.useQuery({ id });
	};

	// Create document with S3 upload
	const createDocument = async (data: {
		name: string;
		kbId: string;
		file: File;
	}) => {
		setIsLoading(true);
		setIsProcessing(true);

		try {
			console.log("开始创建文档:", {
				name: data.name,
				kbId: data.kbId,
				fileName: data.file.name,
			});

			// Upload file using the centralized hook
			const result = await upload(data.file);

			// Extract key and URLs from the upload result
			const key = result.key;
			const fileUrl = result.longLivedUrl || result.fileUrl;

			// Create document record
			const docResult = await utils.client.kbs.createDocument.mutate({
				name: data.name,
				kbId: data.kbId,
				fileType: data.file.type,
				fileSize: data.file.size,
				filePath: key,
				mimeType: data.file.type,
				fileUrl: fileUrl, // Save the long-lived URL to database
			});

			setIsLoading(false);

			// Invalidate queries
			if (docResult?.kbId) {
				await utils.kbs.getDocuments.invalidate({
					kbId: docResult.kbId,
				});
			}
			await utils.kbs.getAll.invalidate();

			setIsProcessing(false);
			onSuccess?.();

			return docResult;
		} catch (error: unknown) {
			setIsLoading(false);
			setIsProcessing(false);

			const errorMessage =
				error instanceof Error ? error.message : "上传文档失败。请再试一次。";

			console.error("文档创建失败:", error);
			onError?.(
				new Error(errorMessage) as unknown as TRPCClientErrorLike<AppRouter>,
			);
			throw new Error(errorMessage);
		}
	};

	// Create multiple documents with S3 upload
	const createDocuments = async (data: {
		kbId: string;
		files: File[];
	}) => {
		setIsLoading(true);
		setIsProcessing(true);

		const results: DocumentResult[] = [];
		const createdDocuments: DocumentResult[] = [];
		const failedUploads: { fileName: string; error: string }[] = [];

		try {
			// Initialize progress tracking
			const initialProgress: Record<string, number> = {};
			for (const file of data.files) {
				initialProgress[file.name] = 0;
			}
			setUploadProgress(initialProgress);

			// Process each file
			for (const file of data.files) {
				try {
					console.log("开始上传文档:", {
						fileName: file.name,
						kbId: data.kbId,
					});

					// Upload file using the centralized hook
					const result = await upload(file);

					// Update progress
					setUploadProgress((prev) => ({
						...prev,
						[file.name]: 100,
					}));

					// Extract key and URLs from the upload result
					const key = result.key;
					const fileUrl = result.longLivedUrl || result.fileUrl;

					// Generate a document name from the file name (remove extension)
					const name = file.name.replace(/\.[^/.]+$/, "");

					// Create document record
					const docResult = await utils.client.kbs.createDocument.mutate({
						name,
						kbId: data.kbId,
						fileType: file.type,
						fileSize: file.size,
						filePath: key,
						mimeType: file.type,
						fileUrl: fileUrl,
					});

					if (docResult) {
						results.push(docResult);
						createdDocuments.push(docResult);
					}
				} catch (error) {
					console.error(`文档 "${file.name}" 上传失败:`, error);
					failedUploads.push({
						fileName: file.name,
						error: error instanceof Error ? error.message : "上传失败",
					});
				}
			}

			// Invalidate queries if any document was created
			if (createdDocuments.length > 0) {
				await utils.kbs.getDocuments.invalidate({
					kbId: data.kbId,
				});
				await utils.kbs.getAll.invalidate();
			}

			// Call success callback if at least one document was created
			if (createdDocuments.length > 0) {
				onSuccess?.();
			}

			return {
				success: createdDocuments.length > 0,
				created: createdDocuments,
				failed: failedUploads,
				total: data.files.length,
			};
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "批量上传文档失败。请再试一次。";

			console.error("批量文档创建失败:", error);
			onError?.(
				new Error(errorMessage) as unknown as TRPCClientErrorLike<AppRouter>,
			);
			throw new Error(errorMessage);
		} finally {
			setIsLoading(false);
			setIsProcessing(false);
			setUploadProgress({});
		}
	};

	// Update document with S3 upload
	const updateDocument = async (data: {
		id: string;
		kbId: string;
		file: File;
	}) => {
		setIsLoading(true);

		try {
			// Upload file using the centralized hook
			const result = await upload(data.file);

			// Extract key and URLs from the upload result
			const key = result.key;
			const fileUrl = result.longLivedUrl || result.fileUrl;

			// Update document record
			const docResult = await utils.client.kbs.updateDocument.mutate({
				id: data.id,
				kbId: data.kbId,
				fileType: data.file.type,
				fileSize: data.file.size,
				filePath: key,
				mimeType: data.file.type,
				fileUrl: fileUrl, // Save the long-lived URL to database
			});

			setIsLoading(false);

			// Invalidate queries
			if (docResult?.kbId) {
				utils.kbs.getDocuments.invalidate({
					kbId: docResult.kbId,
				});
			}
			utils.kbs.getAll.invalidate();
			onSuccess?.();

			return docResult;
		} catch (error: unknown) {
			setIsLoading(false);
			onError?.(error as TRPCClientErrorLike<AppRouter>);
			throw error;
		}
	};

	const deleteDocument = async (id: string, kbId?: string) => {
		setIsLoading(true);
		try {
			// 先获取文档状态，检查是否已向量化
			const document = await utils.client.kbs.getDocumentById.query({ id });

			// Delete document from database first
			const result = await utils.client.kbs.deleteDocument.mutate({ id });

			// If document was successfully deleted and was vectorized, clean up related vector data
			if (result && kbId && document?.vectorizationStatus === "completed") {
				try {
					const collectionName = QDRANT_COLLECTION_NAME;

					// Delete Qdrant points related to this document
					await utils.client.qdrant.deletePointsByDocumentId.mutate({
						collectionName,
						documentId: id,
					});
				} catch (qdrantError) {
					// Log but don't fail the entire operation if Qdrant deletion fails
					console.error("删除Qdrant点失败:", qdrantError);
				}
			}

			// Invalidate queries to refresh UI
			if (kbId) {
				await utils.kbs.getDocuments.invalidate({
					kbId,
				});
			}
			await utils.kbs.getAll.invalidate();
			onSuccess?.();

			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			onError?.(error as TRPCClientErrorLike<AppRouter>);
			throw error;
		}
	};

	// Vectorize document
	const vectorizeDocument = async (data: {
		kbId: string;
		documentId: string;
		collectionName: string;
		url?: string;
	}) => {
		setIsProcessing(true);
		try {
			// 如果没有提供URL，尝试获取文档以获取URL
			let documentUrl = data.url;
			if (!documentUrl) {
				// 直接使用API客户端获取文档，而不是使用hook
				const docResponse = await utils.client.kbs.getDocumentById.query({
					id: data.documentId,
				});

				if (!docResponse?.fileUrl) {
					throw new Error("文档URL未找到");
				}

				documentUrl = docResponse.fileUrl;
			}

			// 首先更新文档状态为处理中
			await utils.client.kbs.updateDocumentStatus.mutate({
				id: data.documentId,
				status: "processing",
				kbId: data.kbId,
			});

			// Start polling for updates to this document
			startPolling([data.documentId]);

			// 调用向量化API
			await fetch("/api/trigger/doc", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...data,
					url: documentUrl,
					webhookUrl: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/doc`,
				}),
			});

			// 立即刷新文档列表
			await utils.kbs.getDocuments.invalidate({
				kbId: data.kbId,
			});

			onSuccess?.();
		} catch (error) {
			console.error("投喂文档失败:", error);
			onError?.(error as TRPCClientErrorLike<AppRouter>);
			throw error;
		} finally {
			setIsProcessing(false);
		}
	};

	// Bulk vectorize documents
	const vectorizeDocuments = async (data: {
		kbId: string;
		documentIds: string[];
		collectionName: string;
	}) => {
		setIsProcessing(true);
		const results = {
			success: [] as string[],
			failed: [] as { id: string; error: string }[],
		};

		try {
			// Start polling for updates to these documents
			startPolling(data.documentIds);

			// Process each document
			for (const documentId of data.documentIds) {
				try {
					// Get document URL
					const docResponse = await utils.client.kbs.getDocumentById.query({
						id: documentId,
					});

					if (!docResponse?.fileUrl) {
						results.failed.push({
							id: documentId,
							error: "文档URL未找到",
						});
						continue;
					}

					// Update document status to processing
					await utils.client.kbs.updateDocumentStatus.mutate({
						id: documentId,
						status: "processing",
						kbId: data.kbId,
					});

					// Call vectorization API
					await fetch("/api/trigger/doc", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							kbId: data.kbId,
							documentId,
							collectionName: data.collectionName,
							url: docResponse.fileUrl,
							webhookUrl: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/doc`,
						}),
					});

					results.success.push(documentId);
				} catch (error) {
					console.error(`文档 ID:${documentId} 向量化失败:`, error);
					results.failed.push({
						id: documentId,
						error: error instanceof Error ? error.message : "向量化处理失败",
					});
				}
			}

			// Refresh document list
			await utils.kbs.getDocuments.invalidate({
				kbId: data.kbId,
			});

			if (results.success.length > 0) {
				onSuccess?.();
			}

			return results;
		} catch (error) {
			console.error("批量向量化文档失败:", error);
			onError?.(error as TRPCClientErrorLike<AppRouter>);
			throw error;
		} finally {
			setIsProcessing(false);
		}
	};

	return {
		getDocumentsByKbId,
		getDocumentById,
		createDocument,
		createDocuments,
		updateDocument,
		deleteDocument,
		vectorizeDocument,
		vectorizeDocuments,
		uploadProgress,
		isLoading,
		isProcessing,
	};
}
