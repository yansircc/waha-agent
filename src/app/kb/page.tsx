"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDocuments } from "@/hooks/use-documents";
import { useKbs } from "@/hooks/use-kbs";
import type { Kb } from "@/types/kb";
import {
	ChevronRight,
	Database,
	FileText,
	FilesIcon,
	Folder,
	Plus,
	Trash2,
	UploadCloud,
} from "lucide-react";
import { useState } from "react";

export default function KnowledgePage() {
	// Knowledge base state
	const [isAddKbOpen, setIsAddKbOpen] = useState(false);
	const [kbName, setKbName] = useState("");
	const [kbDescription, setKbDescription] = useState("");
	const [selectedKb, setSelectedKb] = useState<Kb | null>(null);

	// Document state
	const [isAddDocOpen, setIsAddDocOpen] = useState(false);
	const [dragActive, setDragActive] = useState(false);
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);

	// View state
	const [tab, setTab] = useState<"list" | "detail">("list");

	// Hooks
	const { kbs, isLoadingKbs, createKb, deleteKb } = useKbs();

	const { createDocument, deleteDocument, getDocumentsByKbId } = useDocuments();

	// Knowledge base handlers
	const handleOpenAddKbDialog = () => setIsAddKbOpen(true);
	const handleCloseAddKbDialog = () => {
		setIsAddKbOpen(false);
		resetKbForm();
	};

	const resetKbForm = () => {
		setKbName("");
		setKbDescription("");
	};

	const handleSubmitKb = async (e: React.FormEvent) => {
		e.preventDefault();

		await createKb({
			name: kbName,
			description: kbDescription,
			content: "", // Empty content, managed through documents
		});

		handleCloseAddKbDialog();
	};

	const handleDeleteKb = async (id: string) => {
		if (confirm("Are you sure you want to delete this knowledge base?")) {
			await deleteKb(id);
			if (selectedKb?.id === id) {
				setSelectedKb(null);
				setTab("list");
			}
		}
	};

	// Document handlers
	const handleOpenAddDocDialog = () => setIsAddDocOpen(true);
	const handleCloseAddDocDialog = () => {
		setIsAddDocOpen(false);
		resetDocForm();
	};

	const resetDocForm = () => {
		setUploadedFile(null);
	};

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

	const handleSubmitDoc = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedKb || !uploadedFile) return;

		try {
			// Check file size limits
			const isTextFile = [
				"text/plain",
				"text/markdown",
				"application/markdown",
			].includes(uploadedFile.type);
			const sizeLimit = isTextFile ? 4 * 1024 * 1024 : 1 * 1024 * 1024; // 4MB for text, 1MB for others

			if (uploadedFile.size > sizeLimit) {
				alert(`File size exceeds the limit of ${isTextFile ? "4MB" : "1MB"}`);
				return;
			}

			// Use the file name as the document name
			const fileName = uploadedFile.name;

			await createDocument({
				name: fileName,
				kbId: selectedKb.id,
				file: uploadedFile,
			});

			handleCloseAddDocDialog();
		} catch (error) {
			console.error("Error creating document:", error);
			alert(
				`Failed to create document. ${error instanceof Error ? error.message : ""}`,
			);
		}
	};

	const handleDeleteDocument = async (id: string) => {
		if (confirm("Are you sure you want to delete this document?")) {
			await deleteDocument(id);
		}
	};

	const handleSelectKb = (kb: Kb) => {
		setSelectedKb(kb);
		setTab("detail");
	};

	const handleBackToList = () => {
		setSelectedKb(null);
		setTab("list");
	};

	// Loading placeholders
	const loadingPlaceholderIds = [
		"placeholder-1",
		"placeholder-2",
		"placeholder-3",
	];

	// Get documents for the selected knowledge base
	const docsQuery = getDocumentsByKbId(selectedKb?.id);

	const documents = docsQuery.data || [];
	const isLoadingDocuments = docsQuery.isLoading || false;

	return (
		<div className="container py-8">
			{tab === "list" ? (
				<>
					<div className="mb-8 flex items-center justify-between">
						<h1 className="font-bold text-3xl">Knowledge Bases</h1>
						<Button onClick={handleOpenAddKbDialog}>
							<Plus className="mr-2 h-4 w-4" /> Add Knowledge Base
						</Button>
					</div>

					{isLoadingKbs ? (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
							{loadingPlaceholderIds.map((id) => (
								<div
									key={id}
									className="h-48 animate-pulse rounded-lg border bg-muted"
								/>
							))}
						</div>
					) : kbs.length === 0 ? (
						<div className="flex flex-col items-center justify-center rounded-lg border bg-background p-12 text-center">
							<Database className="mb-2 h-12 w-12 text-muted-foreground" />
							<h2 className="mb-2 font-semibold text-xl">
								No knowledge bases yet
							</h2>
							<p className="mb-6 text-muted-foreground">
								Add your first knowledge base to enhance your agents with
								domain-specific knowledge.
							</p>
							<Button onClick={handleOpenAddKbDialog}>
								<Plus className="mr-2 h-4 w-4" /> Add Knowledge Base
							</Button>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
							{kbs.map((kb) => (
								<div
									key={kb.id}
									className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-background p-6 shadow transition-all hover:shadow-md"
									onClick={() => handleSelectKb(kb)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											handleSelectKb(kb);
										}
									}}
								>
									<div className="mb-4 flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Folder className="h-5 w-5 text-primary" />
											<h3 className="font-semibold text-xl tracking-tight">
												{kb.name}
											</h3>
										</div>
										<Button
											variant="ghost"
											size="sm"
											className="opacity-0 group-hover:opacity-100"
											onClick={(e) => {
												e.stopPropagation();
												handleDeleteKb(kb.id);
											}}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>

									{kb.description && (
										<p className="mb-4 text-muted-foreground text-sm">
											{kb.description}
										</p>
									)}

									<div className="mt-auto flex items-center justify-between pt-4 text-sm">
										<span className="flex items-center gap-1">
											<FilesIcon className="h-4 w-4" />
											{kb.documents?.length || 0} documents
										</span>
										<div className="flex items-center gap-1">
											<span className="text-muted-foreground">
												{new Date(kb.createdAt).toLocaleDateString()}
											</span>
											<ChevronRight className="h-4 w-4" />
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</>
			) : (
				<>
					{selectedKb && (
						<>
							<div className="mb-4">
								<Button variant="outline" onClick={handleBackToList}>
									&larr; Back to Knowledge Bases
								</Button>
							</div>

							<div className="mb-8 flex items-center justify-between">
								<div>
									<h1 className="font-bold text-3xl">{selectedKb.name}</h1>
									{selectedKb.description && (
										<p className="mt-1 text-muted-foreground">
											{selectedKb.description}
										</p>
									)}
								</div>
								<Button onClick={handleOpenAddDocDialog}>
									<Plus className="mr-2 h-4 w-4" /> Add Document
								</Button>
							</div>

							{isLoadingDocuments ? (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{loadingPlaceholderIds.map((id) => (
										<div
											key={id}
											className="h-48 animate-pulse rounded-lg border bg-muted"
										/>
									))}
								</div>
							) : documents.length === 0 ? (
								<div className="flex flex-col items-center justify-center rounded-lg border bg-background p-12 text-center">
									<FileText className="mb-2 h-12 w-12 text-muted-foreground" />
									<h2 className="mb-2 font-semibold text-xl">
										No documents yet
									</h2>
									<p className="mb-6 text-muted-foreground">
										Add your first document to this knowledge base.
									</p>
									<Button onClick={handleOpenAddDocDialog}>
										<Plus className="mr-2 h-4 w-4" /> Add Document
									</Button>
								</div>
							) : (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{documents.map((doc) => (
										<Card key={doc.id}>
											<CardHeader className="flex flex-row items-center justify-between pb-2">
												<CardTitle className="text-lg">{doc.name}</CardTitle>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleDeleteDocument(doc.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</CardHeader>
											<CardContent>
												<div className="mb-2 text-muted-foreground text-sm">
													{doc.content && doc.content.length > 150
														? `${doc.content.substring(0, 150)}...`
														: doc.content || "No text content"}
												</div>

												<div className="flex items-center justify-between text-xs">
													<div>
														{doc.fileType && (
															<span className="rounded-full bg-muted px-2 py-1">
																{doc.fileType}
															</span>
														)}
													</div>
													<div className="text-muted-foreground">
														{new Date(doc.createdAt).toLocaleDateString()}
													</div>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							)}
						</>
					)}
				</>
			)}

			{/* Add Knowledge Base Dialog */}
			<Dialog open={isAddKbOpen} onOpenChange={setIsAddKbOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Add Knowledge Base</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmitKb}>
						<div className="grid gap-6 py-4">
							<div className="grid gap-2">
								<Label htmlFor="kb-name">Name</Label>
								<Input
									id="kb-name"
									value={kbName}
									onChange={(e) => setKbName(e.target.value)}
									placeholder="Product Manual"
									required
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="kb-description">Description (Optional)</Label>
								<Input
									id="kb-description"
									value={kbDescription}
									onChange={(e) => setKbDescription(e.target.value)}
									placeholder="Knowledge about our products and services"
								/>
							</div>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={handleCloseAddKbDialog}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={!kbName}>
								Create Knowledge Base
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Add Document Dialog */}
			<Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>Upload Document</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmitDoc}>
						<div className="grid gap-6 py-4">
							<div className="grid gap-2">
								<Label>Upload File</Label>
								{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus */}
								<button
									type="button"
									className={`flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-left transition-colors ${
										dragActive ? "border-primary bg-primary/10" : "border-muted"
									}`}
									onDragEnter={handleDrag}
									onDragLeave={handleDrag}
									onDragOver={handleDrag}
									onDrop={handleDrop}
									onClick={() =>
										document.getElementById("file-upload")?.click()
									}
								>
									<input
										id="file-upload"
										type="file"
										className="hidden"
										onChange={handleFileInput}
									/>
									{uploadedFile ? (
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
								onClick={handleCloseAddDocDialog}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={!uploadedFile}>
								Upload Document
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
