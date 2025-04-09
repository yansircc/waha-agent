"use client";

import { api } from "@/utils/api";
import { useState } from "react";

export interface UseS3UploadOptions {
	onSuccess?: (url: string) => void;
	onError?: (error: Error) => void;
}

export function useS3Upload(options: UseS3UploadOptions = {}) {
	const [isUploading, setIsUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<Error | null>(null);

	const uploadMutation = api.s3.getUploadUrl.useMutation();

	const upload = async (file: File): Promise<string> => {
		setIsUploading(true);
		setProgress(0);
		setError(null);

		try {
			// 1. Get a presigned URL from our API
			const { url, key } = await uploadMutation.mutateAsync({
				fileName: file.name,
				fileType: file.type,
			});

			// 2. Create FormData to send to our proxy endpoint
			const formData = new FormData();
			formData.append("file", file);
			formData.append("key", key);
			formData.append("url", url);

			// 3. Use our API proxy endpoint with progress tracking
			const xhr = new XMLHttpRequest();

			// Track upload progress
			xhr.upload.addEventListener("progress", (event) => {
				if (event.lengthComputable) {
					const percentComplete = (event.loaded / event.total) * 100;
					setProgress(percentComplete);
				}
			});

			// Send the request using XMLHttpRequest for progress tracking
			const result = await new Promise<any>((resolve, reject) => {
				xhr.open("POST", "/api/upload/proxy");

				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						try {
							const response = JSON.parse(xhr.responseText);
							resolve(response);
						} catch (e) {
							reject(new Error("Invalid response from server"));
						}
					} else {
						try {
							const errorResponse = JSON.parse(xhr.responseText);
							reject(
								new Error(
									errorResponse.error ||
										`Upload failed with status ${xhr.status}`,
								),
							);
						} catch (e) {
							reject(new Error(`Upload failed with status ${xhr.status}`));
						}
					}
				};

				xhr.onerror = () => reject(new Error("Network error during upload"));
				xhr.send(formData);
			});

			// Handle success
			options.onSuccess?.(result.fileUrl);
			setProgress(100);
			return key;
		} catch (err) {
			console.error("Upload error:", err);
			const uploadError =
				err instanceof Error ? err : new Error("Unknown upload error");
			setError(uploadError);
			options.onError?.(uploadError);
			throw uploadError;
		} finally {
			setIsUploading(false);
		}
	};

	return {
		upload,
		isUploading,
		progress,
		error,
	};
}
