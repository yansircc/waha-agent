"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";

interface AddDocumentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (files: File[]) => Promise<void>;
}

export function AddDocumentDialog({
	open,
	onOpenChange,
	onSubmit,
}: AddDocumentDialogProps) {
	const [dragActive, setDragActive] = useState(false);
	const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
	const [isUploading, setIsUploading] = useState(false);

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
		if (uploadedFiles.length === 0 || isUploading) return;

		setIsUploading(true);
		try {
			// Validate all files before uploading
			for (const file of uploadedFiles) {
				const isTextFile = [
					"text/plain",
					"text/markdown",
					"application/markdown",
				].includes(file.type);
				const sizeLimit = isTextFile ? 4 * 1024 * 1024 : 2 * 1024 * 1024;

				if (file.size > sizeLimit) {
					alert(
						`File "${file.name}" exceeds size limit - ${isTextFile ? "4MB" : "2MB"}`,
					);
					setIsUploading(false);
					return;
				}
			}

			await onSubmit(uploadedFiles);
			handleClose();
		} catch (error) {
			console.error("Error uploading documents:", error);
			alert(`Upload failed. ${error instanceof Error ? error.message : ""}`);
			setIsUploading(false);
		}
	};

	const handleClose = () => {
		if (isUploading) return; // Prevent closing while uploading
		onOpenChange(false);
		setUploadedFiles([]);
		setIsUploading(false);
	};

	const getTotalSize = () => {
		return uploadedFiles.reduce((acc, file) => acc + file.size, 0);
	};

	return (
		<Dialog open={open} onOpenChange={isUploading ? undefined : onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>上传文档</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-6 py-4">
						<div className="grid gap-2">
							<Label>上传文件</Label>
							<button
								type="button"
								className={`flex min-h-[150px] w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-left transition-colors ${
									dragActive
										? "border-primary bg-primary/10"
										: isUploading
											? "cursor-not-allowed border-blue-300 bg-blue-50"
											: "border-muted"
								}`}
								onDragEnter={isUploading ? undefined : handleDrag}
								onDragLeave={isUploading ? undefined : handleDrag}
								onDragOver={isUploading ? undefined : handleDrag}
								onDrop={isUploading ? undefined : handleDrop}
								onClick={
									isUploading
										? undefined
										: () => document.getElementById("file-upload")?.click()
								}
								disabled={isUploading}
							>
								<input
									id="file-upload"
									type="file"
									multiple
									className="hidden"
									onChange={handleFileInput}
									disabled={isUploading}
								/>
								{isUploading ? (
									<>
										<Loader2 className="mb-2 h-10 w-10 animate-spin text-blue-500" />
										<p className="font-medium">上传中...</p>
										<p className="text-muted-foreground text-sm">
											请稍候，我们正在上传您的文档
										</p>
									</>
								) : (
									<>
										<UploadCloud className="mb-2 h-10 w-10 text-muted-foreground" />
										<p className="mb-1 font-medium">拖放文件或点击浏览</p>
										<p className="text-muted-foreground text-sm">
											支持多文件上传，包括TXT、PDF、DOCX等文档格式
										</p>
									</>
								)}
							</button>

							{uploadedFiles.length > 0 && !isUploading && (
								<div className="mt-4">
									<Label className="mb-2 block">
										已选文件 ({uploadedFiles.length})
									</Label>
									<div className="max-h-[200px] overflow-y-auto rounded border p-2">
										{uploadedFiles.map((file, index) => (
											<div
												key={`${file.name}-${index}`}
												className="mb-2 flex items-center justify-between rounded bg-gray-50 p-2 last:mb-0"
											>
												<div className="flex items-center">
													<FileText className="mr-2 h-4 w-4 text-primary" />
													<div>
														<p className="max-w-[350px] truncate font-medium text-sm">
															{file.name}
														</p>
														<p className="text-muted-foreground text-xs">
															{(file.size / 1024).toFixed(2)} KB
														</p>
													</div>
												</div>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => handleRemoveFile(index)}
													className="h-8 w-8"
												>
													<Trash2 className="h-4 w-4 text-muted-foreground" />
												</Button>
											</div>
										))}
									</div>
									{uploadedFiles.length > 1 && (
										<p className="mt-2 text-muted-foreground text-xs">
											总大小: {(getTotalSize() / 1024 / 1024).toFixed(2)} MB
										</p>
									)}
								</div>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isUploading}
						>
							取消
						</Button>
						<Button
							type="submit"
							disabled={uploadedFiles.length === 0 || isUploading}
						>
							{isUploading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									上传中...
								</>
							) : (
								`上传文档 (${uploadedFiles.length})`
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
