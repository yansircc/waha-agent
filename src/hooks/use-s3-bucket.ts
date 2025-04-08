"use client";

import { api } from "@/utils/api";
import { useState } from "react";
import { useCallback } from "react";

interface UseS3BucketOptions {
	userId?: string;
	defaultKeyPrefix?: string;
}

interface UploadFileOptions {
	contentType?: string;
	maxSizeBytes?: number;
}

export function useS3Bucket({
	userId,
	defaultKeyPrefix = "",
}: UseS3BucketOptions = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const apiUtils = api.useUtils();
	const s3Api = api.s3;

	const fileExistsMutation = s3Api.fileExists.useMutation();
	const getFileMutation = s3Api.getFile.useMutation();
	const getPresignedUrlMutation = s3Api.getPresignedUrl.useMutation();
	const deleteFileMutation = s3Api.deleteFile.useMutation();
	const uploadTextMutation = s3Api.uploadText.useMutation();
	const uploadBinaryMutation = s3Api.uploadBinary.useMutation();
	const createUserBucketMutation = s3Api.createUserBucket.useMutation();

	// Helper to prefix keys with user ID and/or default prefix
	const getPrefixedKey = useCallback(
		(key: string): string => {
			const parts: string[] = [];

			if (userId) {
				parts.push(userId);
			}

			if (defaultKeyPrefix) {
				parts.push(defaultKeyPrefix);
			}

			parts.push(key);

			return parts.join("/");
		},
		[userId, defaultKeyPrefix],
	);

	// Check if a file exists
	const exists = useCallback(
		async (key: string): Promise<boolean> => {
			setError(null);
			setIsLoading(true);

			try {
				return await fileExistsMutation.mutateAsync({
					key: getPrefixedKey(key),
				});
			} catch (err) {
				setError(err instanceof Error ? err : new Error(String(err)));
				return false;
			} finally {
				setIsLoading(false);
			}
		},
		[fileExistsMutation, getPrefixedKey],
	);

	// Get file content
	const getFile = useCallback(
		async (key: string) => {
			setError(null);
			setIsLoading(true);

			try {
				return await getFileMutation.mutateAsync({ key: getPrefixedKey(key) });
			} catch (err) {
				setError(err instanceof Error ? err : new Error(String(err)));
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		[getFileMutation, getPrefixedKey],
	);

	// Get a presigned URL for a file
	const getPresignedUrl = useCallback(
		async (key: string, expiresIn = 3600): Promise<string> => {
			setError(null);
			setIsLoading(true);

			try {
				return await getPresignedUrlMutation.mutateAsync({
					key: getPrefixedKey(key),
					expiresIn,
				});
			} catch (err) {
				setError(err instanceof Error ? err : new Error(String(err)));
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		[getPresignedUrlMutation, getPrefixedKey],
	);

	// Delete a file
	const remove = useCallback(
		async (key: string): Promise<boolean> => {
			setError(null);
			setIsLoading(true);

			try {
				await deleteFileMutation.mutateAsync({ key: getPrefixedKey(key) });
				return true;
			} catch (err) {
				setError(err instanceof Error ? err : new Error(String(err)));
				return false;
			} finally {
				setIsLoading(false);
			}
		},
		[deleteFileMutation, getPrefixedKey],
	);

	// Upload text content
	const uploadTextContent = useCallback(
		async (
			key: string,
			content: string,
			options: UploadFileOptions = {},
		): Promise<boolean> => {
			setError(null);
			setIsLoading(true);

			try {
				await uploadTextMutation.mutateAsync({
					key: getPrefixedKey(key),
					content,
					contentType: options.contentType,
					maxSizeBytes: options.maxSizeBytes,
				});
				return true;
			} catch (err) {
				setError(err instanceof Error ? err : new Error(String(err)));
				return false;
			} finally {
				setIsLoading(false);
			}
		},
		[uploadTextMutation, getPrefixedKey],
	);

	// Upload a file (auto-detects if binary or text)
	const uploadFile = useCallback(
		async (
			key: string,
			content: string | File | Blob,
			options: UploadFileOptions = {},
		): Promise<boolean> => {
			setError(null);
			setIsLoading(true);

			try {
				// Handle File or Blob
				if (content instanceof File || content instanceof Blob) {
					const arrayBuffer = await content.arrayBuffer();
					const base64 = Buffer.from(arrayBuffer).toString("base64");

					await uploadBinaryMutation.mutateAsync({
						key: getPrefixedKey(key),
						base64,
						contentType:
							options.contentType || content.type || "application/octet-stream",
						maxSizeBytes: options.maxSizeBytes,
					});
					return true;
				}

				// Handle string content (likely text)
				if (typeof content === "string") {
					await uploadTextMutation.mutateAsync({
						key: getPrefixedKey(key),
						content,
						contentType: options.contentType || "text/plain",
						maxSizeBytes: options.maxSizeBytes,
					});
					return true;
				}

				throw new Error(
					"Unsupported content type. Expected string, File, or Blob",
				);
			} catch (err) {
				setError(err instanceof Error ? err : new Error(String(err)));
				return false;
			} finally {
				setIsLoading(false);
			}
		},
		[uploadBinaryMutation, uploadTextMutation, getPrefixedKey],
	);

	// Create a user folder/namespace
	const createBucket = useCallback(async (): Promise<boolean> => {
		if (!userId) {
			setError(new Error("userId is required to create a bucket"));
			return false;
		}

		setError(null);
		setIsLoading(true);

		try {
			await createUserBucketMutation.mutateAsync({
				userId,
			});
			return true;
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)));
			return false;
		} finally {
			setIsLoading(false);
		}
	}, [userId, createUserBucketMutation]);

	return {
		isLoading,
		error,
		exists,
		getFile,
		getPresignedUrl,
		remove,
		uploadTextContent,
		uploadFile,
		createBucket,
		getPrefixedKey,
	};
}
