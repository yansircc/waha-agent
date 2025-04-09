"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatFileSize } from "@/lib/utils";
import type { Document } from "@/types/document";
import { Link, Loader2, Trash2, Wand2 } from "lucide-react";

interface DocumentCardProps {
	document: Document;
	onDelete: (id: string) => void;
	onVectorize: (id: string) => void;
}

export function DocumentCard({
	document,
	onDelete,
	onVectorize,
}: DocumentCardProps) {
	const isProcessing = document.vectorizationStatus === "processing";
	const isPending = document.vectorizationStatus === "pending";
	const isFailed = document.vectorizationStatus === "failed";

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="font-medium text-base">{document.name}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between text-sm">
					<div className="text-muted-foreground">
						{formatFileSize(document.fileSize || 0)}
					</div>
					<div className="text-muted-foreground">
						{document.createdAt
							? new Date(document.createdAt).toLocaleDateString()
							: "No date"}
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex justify-between gap-2">
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={!isPending && !isFailed}
						onClick={() => onVectorize(document.id)}
					>
						{isProcessing ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								处理中
							</>
						) : (
							<>
								<Wand2 className="mr-2 h-4 w-4" />
								{isPending ? "向量化" : isFailed ? "重试" : "已完成"}
							</>
						)}
					</Button>
					<Button variant="outline" size="sm">
						<Link className="mr-2 h-4 w-4" />
						临时链接
					</Button>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onDelete(document.id)}
					className="text-destructive hover:text-destructive"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</CardFooter>
		</Card>
	);
}
