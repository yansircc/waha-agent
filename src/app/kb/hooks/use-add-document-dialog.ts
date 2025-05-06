"use client";

import { useState } from "react";
import { useKbStore } from "./store";
import { useDocumentApi } from "./use-document-api";

/**
 * 提供添加文档对话框的状态管理和操作
 */
export function useAddDocumentDialog() {
	const [dragActive, setDragActive] = useState(false);
	const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
	const [isUploading, setIsUploading] = useState(false);

	// Store actions
	const isAddDocOpen = useKbStore((state) => state.isAddDocOpen);
	const setIsAddDocOpen = useKbStore((state) => state.setIsAddDocOpen);
	const selectedKb = useKbStore((state) => state.selectedKb);

	// Document API
	const { createDocuments } = useDocumentApi();

	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (e.dataTransfer.files?.length) {
			const filesArray = Array.from(e.dataTransfer.files);
			setUploadedFiles((prev) => [...prev, ...filesArray]);
		}
	};

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.length) {
			const filesArray = Array.from(e.target.files);
			setUploadedFiles((prev) => [...prev, ...filesArray]);
		}
	};

	const handleRemoveFile = (index: number) => {
		setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedKb || uploadedFiles.length === 0 || isUploading) return;

		setIsUploading(true);
		try {
			// Validate all files before uploading
			for (const file of uploadedFiles) {
				const isTextFile = [
					"text/plain",
					"text/markdown",
					"application/markdown",
				].includes(file.type);
				const sizeLimit = isTextFile ? 10 * 1024 * 1024 : 5 * 1024 * 1024;

				if (file.size > sizeLimit) {
					throw new Error(
						`File "${file.name}" exceeds size limit - ${isTextFile ? "10MB" : "5MB"}`,
					);
				}
			}

			// Upload all files
			await createDocuments({
				kbId: selectedKb.id,
				files: uploadedFiles,
			});

			handleClose();
		} catch (error) {
			console.error("Error uploading documents:", error);
		} finally {
			setIsUploading(false);
		}
	};

	const handleClose = () => {
		if (isUploading) return; // Prevent closing while uploading
		setIsAddDocOpen(false);
		setUploadedFiles([]);
		setIsUploading(false);
		setDragActive(false);
	};

	const getTotalSize = () => {
		return uploadedFiles.reduce((acc, file) => acc + file.size, 0);
	};

	return {
		dragActive,
		uploadedFiles,
		isUploading,
		isOpen: isAddDocOpen,
		onOpenChange: setIsAddDocOpen,
		handleDrag,
		handleDrop,
		handleFileInput,
		handleRemoveFile,
		handleSubmit,
		handleClose,
		getTotalSize,
	};
}
