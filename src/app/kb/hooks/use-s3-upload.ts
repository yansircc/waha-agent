"use client";

import { api } from "@/utils/api";
import { useState } from "react";

export interface UseS3UploadOptions {
	onSuccess?: (fileInfo: { fileUrl: string; longLivedUrl?: string }) => void;
	onError?: (error: Error) => void;
}

export interface UploadResult {
	key: string;
	fileUrl: string;
	longLivedUrl?: string;
	expiresAt?: string;
}

export function useS3Upload(options: UseS3UploadOptions = {}) {
	const [isUploading, setIsUploading] = useState(false);
	const [isConverting, setIsConverting] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<Error | null>(null);

	const uploadMutation = api.s3.getUploadUrl.useMutation();
	const longLivedUrlMutation = api.s3.getLongLivedUrl.useMutation();
	const convertToMarkdownMutation =
		api.documents.convertToMarkdown.useMutation();

	const upload = async (file: File): Promise<UploadResult> => {
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
			const result = await new Promise<UploadResult>((resolve, reject) => {
				xhr.open("POST", "/api/upload/proxy");

				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						try {
							const response = JSON.parse(xhr.responseText);
							resolve({
								key: response.key,
								fileUrl: response.fileUrl,
								longLivedUrl: response.longLivedUrl,
								expiresAt: response.expiresAt,
							});
						} catch (e) {
							reject(new Error("服务器响应无效"));
						}
					} else {
						try {
							const errorResponse = JSON.parse(xhr.responseText);
							reject(
								new Error(
									errorResponse.error || `上传失败，状态码 ${xhr.status}`,
								),
							);
						} catch (e) {
							reject(new Error(`上传失败，状态码 ${xhr.status}`));
						}
					}
				};

				xhr.onerror = () => reject(new Error("网络错误上传期间"));
				xhr.send(formData);
			});

			// Handle success
			options.onSuccess?.({
				fileUrl: result.fileUrl,
				longLivedUrl: result.longLivedUrl,
			});
			setProgress(100);
			return result;
		} catch (err) {
			console.error("上传错误:", err);
			const uploadError =
				err instanceof Error ? err : new Error("未知上传错误");
			setError(uploadError);
			options.onError?.(uploadError);
			throw uploadError;
		} finally {
			setIsUploading(false);
		}
	};

	/**
	 * 上传文档并立即转换为Markdown格式
	 * 操作流程：1. 上传原始文件，2. 转换为Markdown，3. 更新数据库中文档的fileUrl
	 */
	const uploadWithMarkdownConversion = async (
		file: File,
		documentId: string,
		deleteOriginal = true,
	): Promise<{ fileUrl: string; documentId: string }> => {
		setIsUploading(true);
		setProgress(0);
		setError(null);

		try {
			// 1. 先正常上传文件
			const uploadResult = await upload(file);
			setIsConverting(true);

			// 2. 转换为Markdown
			const conversionResult = await convertToMarkdownMutation.mutateAsync({
				documentId,
				originalUrl: uploadResult.fileUrl,
				deleteOriginal,
			});

			// 3. 返回新的Markdown URL
			options.onSuccess?.({
				fileUrl: conversionResult.fileUrl,
			});

			return {
				fileUrl: conversionResult.fileUrl,
				documentId: conversionResult.documentId,
			};
		} catch (err) {
			console.error("上传或转换错误:", err);
			const processError =
				err instanceof Error ? err : new Error("文档上传或转换过程失败");
			setError(processError);
			options.onError?.(processError);
			throw processError;
		} finally {
			setIsUploading(false);
			setIsConverting(false);
		}
	};

	/**
	 * 获取文件的长期访问链接（7天有效）
	 * 适用于已经上传的文件
	 */
	const getLongLivedUrl = async (key: string): Promise<string> => {
		try {
			return await longLivedUrlMutation.mutateAsync({ key });
		} catch (err) {
			console.error("获取长期访问链接错误:", err);
			const urlError =
				err instanceof Error ? err : new Error("获取长期访问链接失败");
			throw urlError;
		}
	};

	return {
		upload,
		uploadWithMarkdownConversion,
		getLongLivedUrl,
		isUploading,
		isConverting,
		progress,
		error,
	};
}
