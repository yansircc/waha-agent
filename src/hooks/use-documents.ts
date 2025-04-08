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

	// Create a new document
	const createDocumentMutation = api.kbs.createDocument.useMutation({
		onSuccess: (data) => {
			// Invalidate the specific documents query for this knowledge base
			if (data?.kbId) {
				utils.kbs.getDocuments.invalidate({
					kbId: data.kbId,
				});
			}
			utils.kbs.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	// Create document with file upload support - only supports file uploads now
	const createDocument = async (data: {
		name: string;
		kbId: string;
		file: File;
	}) => {
		setIsLoading(true);

		try {
			const formData = new FormData();
			formData.append("name", data.name);
			formData.append("kbId", data.kbId);
			formData.append("file", data.file);

			const response = await fetch("/api/kb/upload", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to upload file");
			}

			const result = await response.json();
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

	// Update a document
	const updateDocumentMutation = api.kbs.updateDocument.useMutation({
		onSuccess: (data) => {
			if (data?.kbId) {
				utils.kbs.getDocuments.invalidate({
					kbId: data.kbId,
				});
			}
			utils.kbs.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	// Update document with file upload support
	const updateDocument = async (data: {
		id: string;
		kbId: string;
		file: File;
	}) => {
		setIsLoading(true);

		try {
			const formData = new FormData();
			formData.append("id", data.id);
			formData.append("kbId", data.kbId);
			formData.append("file", data.file);

			const response = await fetch("/api/kb/upload", {
				method: "PUT",
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.error || "Failed to update document with file",
				);
			}

			const result = await response.json();
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

	// Delete a document
	const deleteDocumentMutation = api.kbs.deleteDocument.useMutation({
		onSuccess: (_data, variables, context) => {
			// When we delete a document, we have its ID but we don't know its KB ID
			// So we just invalidate all document queries
			utils.kbs.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const deleteDocument = async (id: string) => {
		setIsLoading(true);
		try {
			const result = await deleteDocumentMutation.mutateAsync({ id });
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	return {
		getDocumentsByKbId,
		getDocumentById,
		createDocument,
		updateDocument,
		deleteDocument,
		isLoading,
	};
}
