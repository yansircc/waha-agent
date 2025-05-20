"use client";

import { QDRANT_COLLECTION_NAME } from "@/lib/constants";
import type { AppRouter } from "@/server/api/root";
import type { BulkCrawlResult } from "@/trigger/bulk-crawl";
import type { Document } from "@/types/document";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useKbStore } from "./store";
import { useS3Upload } from "./use-s3-upload";

interface UseDocumentApiOptions {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

/**
 * Hook for document CRUD and vectorization operations
 */
export function useDocumentApi(options: UseDocumentApiOptions = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);

	// Get store states and actions
	const addProcessingDocId = useKbStore((state) => state.addProcessingDocId);
	const removeProcessingDocId = useKbStore(
		(state) => state.removeProcessingDocId,
	);
	const addDeletingDocId = useKbStore((state) => state.addDeletingDocId);
	const removeDeletingDocId = useKbStore((state) => state.removeDeletingDocId);
	const setUploadProgress = useKbStore((state) => state.setUploadProgress);
	const resetUploadProgress = useKbStore((state) => state.resetUploadProgress);
	const addVectorizationRun = useKbStore((state) => state.addVectorizationRun);

	const { upload } = useS3Upload();
	const utils = api.useUtils();

	// Get documents by knowledge base ID
	const getDocumentsByKbId = (kbId: string | undefined) => {
		return api.kbs.getDocuments.useQuery(
			{ kbId: kbId || "" },
			{ enabled: !!kbId },
		);
	};

	// Get document by ID
	const getDocumentById = (id: string) => {
		return api.kbs.getDocumentById.useQuery({ id });
	};

	// Create a document with S3 upload
	const createDocument = async (data: {
		name: string;
		kbId: string;
		file: File;
	}) => {
		setIsLoading(true);
		setIsProcessing(true);

		try {
			console.log("Creating document:", {
				name: data.name,
				kbId: data.kbId,
				fileName: data.file.name,
			});

			// Upload file using the S3 upload hook
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

			// Invalidate queries
			if (docResult?.kbId) {
				await utils.kbs.getDocuments.invalidate({
					kbId: docResult.kbId,
				});
			}
			await utils.kbs.getAll.invalidate();

			options.onSuccess?.();
			return docResult;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to upload document. Please try again.";

			console.error("Document creation failed:", error);
			options.onError?.(
				new Error(errorMessage) as unknown as TRPCClientErrorLike<AppRouter>,
			);
			throw new Error(errorMessage);
		} finally {
			setIsLoading(false);
			setIsProcessing(false);
		}
	};

	// Create multiple documents with S3 upload
	const createDocuments = async (data: {
		kbId: string;
		files: File[];
	}) => {
		setIsLoading(true);
		setIsProcessing(true);

		const results: Document[] = [];
		const createdDocuments: Document[] = [];
		const failedUploads: { fileName: string; error: string }[] = [];

		try {
			// Initialize progress tracking
			const initialProgress: Record<string, number> = {};
			for (const file of data.files) {
				initialProgress[file.name] = 0;
				setUploadProgress(file.name, 0);
			}

			// Process each file
			for (const file of data.files) {
				try {
					console.log("Uploading document:", {
						fileName: file.name,
						kbId: data.kbId,
					});

					// Upload file using the S3 upload hook
					const result = await upload(file);

					// Update progress
					setUploadProgress(file.name, 100);

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
					console.error(`Document "${file.name}" upload failed:`, error);
					failedUploads.push({
						fileName: file.name,
						error: error instanceof Error ? error.message : "Upload failed",
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
				options.onSuccess?.();
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
					: "Batch document upload failed. Please try again.";

			console.error("Batch document creation failed:", error);
			options.onError?.(
				new Error(errorMessage) as unknown as TRPCClientErrorLike<AppRouter>,
			);
			throw new Error(errorMessage);
		} finally {
			setIsLoading(false);
			setIsProcessing(false);
			resetUploadProgress();
		}
	};

	// Update a document with S3 upload
	const updateDocument = async (data: {
		id: string;
		kbId: string;
		file: File;
	}) => {
		setIsLoading(true);

		try {
			// Upload file using the S3 upload hook
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

			// Invalidate queries
			if (docResult?.kbId) {
				await utils.kbs.getDocuments.invalidate({
					kbId: docResult.kbId,
				});
			}
			await utils.kbs.getAll.invalidate();
			options.onSuccess?.();

			return docResult;
		} catch (error: unknown) {
			options.onError?.(error as TRPCClientErrorLike<AppRouter>);
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	// Delete a document
	const deleteDocument = async (id: string, kbId?: string) => {
		setIsLoading(true);

		try {
			// Add to deleting IDs
			addDeletingDocId(id);

			// First get document status to check if it's vectorized
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
					console.error("Failed to delete Qdrant points:", qdrantError);
				}
			}

			// Invalidate queries to refresh UI
			if (kbId) {
				await utils.kbs.getDocuments.invalidate({
					kbId,
				});
			}
			await utils.kbs.getAll.invalidate();
			options.onSuccess?.();

			return result;
		} catch (error: unknown) {
			options.onError?.(error as TRPCClientErrorLike<AppRouter>);
			throw error;
		} finally {
			setIsLoading(false);
			removeDeletingDocId(id);
		}
	};

	// Vectorize a document using Trigger.dev
	const vectorizeDocument = async (data: {
		kbId: string;
		documentId: string;
		collectionName: string;
		url?: string;
	}) => {
		setIsProcessing(true);

		try {
			// Add to processing document IDs
			addProcessingDocId(data.documentId);

			// If URL isn't provided, try to get it from the document
			let documentUrl = data.url;
			if (!documentUrl) {
				// Get document to retrieve URL
				const docResponse = await utils.client.kbs.getDocumentById.query({
					id: data.documentId,
				});

				if (!docResponse?.fileUrl) {
					throw new Error("Document URL not found");
				}

				documentUrl = docResponse.fileUrl;
			}

			// First update document status to processing
			await utils.client.kbs.updateDocumentStatus.mutate({
				id: data.documentId,
				status: "processing",
				kbId: data.kbId,
			});

			// Call tRPC method to trigger document vectorization task
			const result =
				await utils.client.documents.triggerDocumentVectorization.mutate({
					documentId: data.documentId,
					kbId: data.kbId,
					url: documentUrl,
					collectionName: data.collectionName,
					userId: "admin", // Default user ID
				});

			// Store the run ID and token for later use
			const runInfo = {
				runId: result.handle.id,
				token: result.token,
				documentId: data.documentId,
				kbId: data.kbId,
			};

			// Add to store
			addVectorizationRun(data.documentId, runInfo);

			// Immediately refresh document list
			await utils.kbs.getDocuments.invalidate({
				kbId: data.kbId,
			});

			options.onSuccess?.();
			return result;
		} catch (error) {
			console.error("Failed to vectorize document:", error);
			options.onError?.(error as TRPCClientErrorLike<AppRouter>);
			throw error;
		} finally {
			setIsProcessing(false);
		}
	};

	// Batch vectorize documents using Trigger.dev
	const vectorizeDocuments = async (data: {
		kbId: string;
		documentIds: string[];
		collectionName: string;
	}) => {
		setIsProcessing(true);
		const results = {
			success: [] as string[],
			failed: [] as { id: string; error: string }[],
			runs: [] as {
				runId: string;
				token: string;
				documentId: string;
				kbId: string;
			}[],
		};

		try {
			// Process each document
			for (const documentId of data.documentIds) {
				try {
					// Add to processing
					addProcessingDocId(documentId);

					// Get document URL
					const docResponse = await utils.client.kbs.getDocumentById.query({
						id: documentId,
					});

					if (!docResponse?.fileUrl) {
						results.failed.push({
							id: documentId,
							error: "Document URL not found",
						});
						removeProcessingDocId(documentId);
						continue;
					}

					// Update document status to processing
					await utils.client.kbs.updateDocumentStatus.mutate({
						id: documentId,
						status: "processing",
						kbId: data.kbId,
					});

					// Trigger the document vectorization task
					const result =
						await utils.client.documents.triggerDocumentVectorization.mutate({
							documentId,
							kbId: data.kbId,
							url: docResponse.fileUrl,
							collectionName: data.collectionName,
							userId: "admin", // Default user ID
						});

					// Store the run information
					const runInfo = {
						runId: result.handle.id,
						token: result.token,
						documentId,
						kbId: data.kbId,
					};

					// Add to store
					addVectorizationRun(documentId, runInfo);

					results.runs.push(runInfo);
					results.success.push(documentId);
				} catch (error) {
					console.error(
						`Document ID:${documentId} vectorization failed:`,
						error,
					);
					removeProcessingDocId(documentId);
					results.failed.push({
						id: documentId,
						error:
							error instanceof Error
								? error.message
								: "Vectorization processing failed",
					});
				}
			}

			// Refresh document list
			await utils.kbs.getDocuments.invalidate({
				kbId: data.kbId,
			});

			if (results.success.length > 0) {
				options.onSuccess?.();
			}

			return results;
		} catch (error) {
			console.error("Batch document vectorization failed:", error);
			options.onError?.(error as TRPCClientErrorLike<AppRouter>);
			throw error;
		} finally {
			setIsProcessing(false);
		}
	};

	// Create document from crawler results
	const createDocumentFromCrawl = async (data: {
		kbId: string;
		fileUrl: string;
		filePath: string;
		fileName?: string;
		fileSize?: number;
		fileType?: string;
	}) => {
		setIsLoading(true);
		try {
			const docResult = await utils.client.kbs.createDocumentsFromCrawl.mutate({
				kbId: data.kbId,
				fileUrl: data.fileUrl,
				filePath: data.filePath,
				fileName: data.fileName,
				fileSize: data.fileSize,
				fileType: data.fileType || "text/markdown",
				metadata: {
					source: "web-crawler",
				},
			});

			// Invalidate queries
			if (docResult?.kbId) {
				await utils.kbs.getDocuments.invalidate({
					kbId: docResult.kbId,
				});
			}
			await utils.kbs.getAll.invalidate();
			options.onSuccess?.();

			return docResult;
		} catch (error: unknown) {
			console.error("Failed to create document from crawl results:", error);
			options.onError?.(error as TRPCClientErrorLike<AppRouter>);
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	// Process crawl results
	const processDocumentsCrawled = async (
		kbId: string | undefined,
		_documentIds: string[],
		crawlOutput?: BulkCrawlResult,
	) => {
		// If crawl output provided, first create document
		if (kbId && crawlOutput) {
			try {
				if (crawlOutput.fileUrl && crawlOutput.filePath) {
					// Create document from crawl results
					await createDocumentFromCrawl({
						kbId,
						fileUrl: crawlOutput.fileUrl,
						filePath: crawlOutput.filePath,
						fileName: `Total ${crawlOutput.totalCount} webpages - ${formatTimestamp(new Date().getTime())}`,
						fileSize: crawlOutput.fileSize || 0,
						fileType: "text/markdown",
					});
				}
			} catch (err) {
				console.error("Failed to create crawled document:", err);
			}
		}

		// Refresh documents for current KB
		if (kbId) {
			await utils.kbs.getDocuments.invalidate({ kbId });
		}
	};

	// Open file in new window
	const openFile = useCallback((fileUrl: string | null | undefined) => {
		if (fileUrl) {
			window.open(fileUrl, "_blank");
		} else {
			toast.error("File URL not available");
		}
	}, []);

	return {
		getDocumentsByKbId,
		getDocumentById,
		createDocument,
		createDocuments,
		updateDocument,
		deleteDocument,
		vectorizeDocument,
		vectorizeDocuments,
		createDocumentFromCrawl,
		processDocumentsCrawled,
		openFile,
		isLoading,
		isProcessing,
	};
}

// Helper function to format timestamps
function formatTimestamp(timestamp: number) {
	const date = new Date(timestamp);
	return date
		.toLocaleString("en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		})
		.replace(/\//g, "-");
}
