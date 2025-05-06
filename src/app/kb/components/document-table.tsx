"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatFileSize } from "@/lib/utils";
import type { Document } from "@/types/document";
import { Check, Loader2, Trash2, Wand2, XCircle } from "lucide-react";
import React from "react";
import { useDocumentTable } from "../hooks";
import { DocumentStatus } from "./document-status";
import { DocumentStatusBadge } from "./status-badge";

interface DocumentTableProps {
	documents: Document[];
	onDelete: (id: string, kbId: string) => void | Promise<void>;
	onVectorize: (id: string) => void | Promise<void>;
	isVectorizing?: boolean;
}

// Using React.memo to avoid unnecessary re-renders
const DocumentStatusCell = React.memo(function DocumentStatusCell({
	document,
	isProcessing,
}: {
	document: Document;
	isProcessing: (doc: Document) => boolean;
}) {
	return (
		<div className="flex items-center space-x-2">
			<DocumentStatusBadge
				status={document.vectorizationStatus}
				isProcessing={isProcessing(document)}
				isCrawling={document.isCrawling}
			/>
			<DocumentStatus documentId={document.id} />
		</div>
	);
});

export function DocumentTable({
	documents,
	onDelete,
	onVectorize,
	isVectorizing = false,
}: DocumentTableProps) {
	// Use the document table hook for all table functionality
	const {
		localDocuments,
		documentToDelete,
		isProcessing,
		isPending,
		isFailed,
		isCompleted,
		isDeleting,
		handleVectorize,
		confirmDelete,
		executeDelete,
		cancelDelete,
		openFile,
	} = useDocumentTable({
		documents,
		onDelete,
		onVectorize,
	});

	return (
		<>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[40%]">文档名</TableHead>
							<TableHead>大小</TableHead>
							<TableHead>日期</TableHead>
							<TableHead>状态</TableHead>
							<TableHead className="text-right">操作</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{localDocuments.map((document) => (
							<TableRow
								key={document.id}
								className={isDeleting(document) ? "opacity-60" : ""}
							>
								<TableCell className="font-medium">
									<a
										href={document.fileUrl || ""}
										target="_blank"
										rel="noopener noreferrer"
										onClick={(e) => {
											// Prevent default link behavior
											e.preventDefault();
											// Use the openFile function from the hook
											openFile(document.fileUrl);
										}}
									>
										{document.name.slice(0, 60) +
											(document.name.length > 60 ? "..." : "")}
									</a>
								</TableCell>
								<TableCell>{formatFileSize(document.fileSize || 0)}</TableCell>
								<TableCell>
									{document.createdAt
										? new Date(document.createdAt).toLocaleDateString()
										: "没有日期"}
								</TableCell>
								<TableCell>
									<DocumentStatusCell
										document={document}
										isProcessing={isProcessing}
									/>
								</TableCell>
								<TableCell className="text-right">
									<div className="flex items-center justify-end space-x-2">
										{/* Vectorize button - always shown but with different icons based on status */}
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
														disabled={
															isProcessing(document) ||
															isDeleting(document) ||
															isCompleted(document)
														}
														onClick={() =>
															!isProcessing(document) &&
															!isCompleted(document) &&
															handleVectorize(document)
														}
													>
														{(() => {
															switch (true) {
																case isProcessing(document):
																	return (
																		<Loader2 className="h-4 w-4 animate-spin" />
																	);
																case isFailed(document):
																	return (
																		<XCircle className="h-4 w-4 text-red-500" />
																	);
																case !isCompleted(document):
																	return <Wand2 className="h-4 w-4" />;
																default:
																	return null;
															}
														})()}
													</Button>
												</TooltipTrigger>
												<TooltipContent>
													<p>
														{isProcessing(document)
															? "处理中..."
															: isCompleted(document)
																? "已投喂"
																: "投喂文档"}
													</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>

										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
														disabled={isDeleting(document)}
														onClick={() => confirmDelete(document)}
													>
														{isDeleting(document) ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<Trash2 className="h-4 w-4 text-red-400" />
														)}
													</Button>
												</TooltipTrigger>
												<TooltipContent>
													<p>删除</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Delete confirmation dialog */}
			<AlertDialog
				open={!!documentToDelete}
				onOpenChange={(open) => !open && cancelDelete()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认删除</AlertDialogTitle>
						<AlertDialogDescription>
							确定要删除文档 "{documentToDelete?.name.slice(0, 40)}
							{documentToDelete?.name && documentToDelete.name.length > 40
								? "..."
								: ""}
							" 吗？此操作无法撤销。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={cancelDelete}>取消</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								documentToDelete && executeDelete(documentToDelete)
							}
							className="bg-red-600 hover:bg-red-700"
						>
							删除
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
