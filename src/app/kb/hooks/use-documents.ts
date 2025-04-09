"use client";

import { env } from "@/env";
import { useS3Upload } from "@/hooks/use-s3-upload";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";

interface UseDocumentsProps {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export function useDocuments({ onSuccess, onError }: UseDocumentsProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const utils = api.useUtils();

	// Use the centralized S3 upload hook
	const { upload } = useS3Upload();

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

	// Create document with S3 upload
	const createDocument = async (data: {
		name: string;
		kbId: string;
		file: File;
	}) => {
		setIsLoading(true);
		setIsProcessing(true);

		try {
			console.log("Starting document creation:", {
				name: data.name,
				kbId: data.kbId,
				fileName: data.file.name,
			});

			// Upload file using the centralized hook
			const key = await upload(data.file);

			// Create document record
			const result = await utils.client.kbs.createDocument.mutate({
				name: data.name,
				kbId: data.kbId,
				fileType: data.file.type,
				fileSize: data.file.size,
				filePath: key,
				mimeType: data.file.type,
			});

			setIsLoading(false);

			// Invalidate queries
			if (result?.kbId) {
				await utils.kbs.getDocuments.invalidate({
					kbId: result.kbId,
				});
			}
			await utils.kbs.getAll.invalidate();

			setIsProcessing(false);
			onSuccess?.();

			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			setIsProcessing(false);

			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to upload document. Please try again.";

			console.error("Document creation error:", error);
			onError?.(
				new Error(errorMessage) as unknown as TRPCClientErrorLike<AppRouter>,
			);
			throw new Error(errorMessage);
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
			const key = await upload(data.file);

			// Update document record
			const result = await utils.client.kbs.updateDocument.mutate({
				id: data.id,
				kbId: data.kbId,
				fileType: data.file.type,
				fileSize: data.file.size,
				filePath: key,
				mimeType: data.file.type,
			});

			setIsLoading(false);

			// Invalidate queries
			if (result?.kbId) {
				utils.kbs.getDocuments.invalidate({
					kbId: result.kbId,
				});
			}
			utils.kbs.getAll.invalidate();
			onSuccess?.();

			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			onError?.(error as TRPCClientErrorLike<AppRouter>);
			throw error;
		}
	};

	const deleteDocument = async (id: string) => {
		setIsLoading(true);
		try {
			const result = await utils.client.kbs.deleteDocument.mutate({ id });
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Vectorize document
	const vectorizeDocument = async (data: {
		kbId: string;
		documentId: string;
		collectionName: string;
		url: string;
	}) => {
		setIsProcessing(true);
		try {
			await fetch("/api/trigger", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...data,
					webhookUrl: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/doc`,
				}),
			});
			onSuccess?.();
		} catch (error) {
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
		updateDocument,
		deleteDocument,
		vectorizeDocument,
		isLoading,
		isProcessing,
	};
}
