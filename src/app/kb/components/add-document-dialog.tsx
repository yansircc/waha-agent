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
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { useState } from "react";

interface AddDocumentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (file: File) => Promise<void>;
}

export function AddDocumentDialog({
	open,
	onOpenChange,
	onSubmit,
}: AddDocumentDialogProps) {
	const [dragActive, setDragActive] = useState(false);
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

		if (e.dataTransfer.files?.[0]) {
			const file = e.dataTransfer.files[0];
			setUploadedFile(file);
		}
	};

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			const file = e.target.files[0];
			setUploadedFile(file);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!uploadedFile || isUploading) return;

		setIsUploading(true);
		try {
			const isTextFile = [
				"text/plain",
				"text/markdown",
				"application/markdown",
			].includes(uploadedFile.type);
			const sizeLimit = isTextFile ? 4 * 1024 * 1024 : 2 * 1024 * 1024;

			if (uploadedFile.size > sizeLimit) {
				alert(`File size exceeds the limit of ${isTextFile ? "4MB" : "2MB"}`);
				setIsUploading(false);
				return;
			}

			await onSubmit(uploadedFile);
			handleClose();
		} catch (error) {
			console.error("Error uploading document:", error);
			alert(
				`Failed to upload document. ${error instanceof Error ? error.message : ""}`,
			);
			setIsUploading(false);
		}
	};

	const handleClose = () => {
		if (isUploading) return; // Prevent closing while uploading
		onOpenChange(false);
		setUploadedFile(null);
		setIsUploading(false);
	};

	return (
		<Dialog open={open} onOpenChange={isUploading ? undefined : onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Upload Document</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-6 py-4">
						<div className="grid gap-2">
							<Label>Upload File</Label>
							<button
								type="button"
								className={`flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-left transition-colors ${
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
									className="hidden"
									onChange={handleFileInput}
									disabled={isUploading}
								/>
								{isUploading ? (
									<>
										<Loader2 className="mb-2 h-10 w-10 animate-spin text-blue-500" />
										<p className="font-medium">Uploading...</p>
										<p className="text-muted-foreground text-sm">
											Please wait while we upload your document
										</p>
									</>
								) : uploadedFile ? (
									<>
										<FileText className="mb-2 h-10 w-10 text-primary" />
										<p className="font-medium">{uploadedFile.name}</p>
										<p className="text-muted-foreground text-sm">
											{(uploadedFile.size / 1024).toFixed(2)} KB
										</p>
									</>
								) : (
									<>
										<UploadCloud className="mb-2 h-10 w-10 text-muted-foreground" />
										<p className="mb-1 font-medium">
											Drag and drop a file or click to browse
										</p>
										<p className="text-muted-foreground text-sm">
											Support for TXT, PDF, DOCX, and other document formats
										</p>
									</>
								)}
							</button>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isUploading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!uploadedFile || isUploading}>
							{isUploading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Uploading...
								</>
							) : (
								"Upload Document"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
