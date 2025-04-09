"use client";

import { useS3Upload } from "@/hooks/use-s3-upload";
import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

interface UploadButtonProps {
	onUploadComplete?: (url: string) => void;
	onUploadError?: (error: Error) => void;
	className?: string;
	accept?: string;
	multiple?: boolean;
}

export function UploadButton({
	onUploadComplete,
	onUploadError,
	className,
	accept,
	multiple = false,
}: UploadButtonProps) {
	const { upload, isUploading, progress, error } = useS3Upload({
		onSuccess: onUploadComplete,
		onError: onUploadError,
	});

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files?.length) return;

		try {
			// If multiple files are selected, upload them sequentially
			for (const file of files) {
				await upload(file);
			}
		} catch (err) {
			console.error("Upload failed:", err);
		}
	};

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<Button variant="outline" className="relative" disabled={isUploading}>
				<input
					type="file"
					className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
					onChange={handleFileChange}
					accept={accept}
					multiple={multiple}
					disabled={isUploading}
				/>
				<UploadCloud className="mr-2 h-4 w-4" />
				{isUploading ? "Uploading..." : "Upload File"}
			</Button>
			{isUploading && <Progress value={progress} />}
			{error && <p className="text-red-500 text-sm">{error.message}</p>}
		</div>
	);
}
