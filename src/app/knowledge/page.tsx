"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useKnowledgeBases } from "@/hooks/use-knowledge-bases";
import { Database, FileText, Plus, UploadCloud } from "lucide-react";
import { useState } from "react";

export default function KnowledgePage() {
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [content, setContent] = useState("");
	const [dragActive, setDragActive] = useState(false);
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);

	const {
		knowledgeBases,
		isLoadingKnowledgeBases,
		createKnowledgeBase,
		deleteKnowledgeBase,
	} = useKnowledgeBases();

	const handleOpenAddDialog = () => setIsAddOpen(true);
	const handleCloseAddDialog = () => {
		setIsAddOpen(false);
		resetForm();
	};

	const resetForm = () => {
		setName("");
		setDescription("");
		setContent("");
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

			// For text files, automatically load the content
			if (file.type === "text/plain") {
				const reader = new FileReader();
				reader.onload = (event) => {
					if (event.target?.result) {
						setContent(event.target.result as string);
					}
				};
				reader.readAsText(file);
			}
		}
	};

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			const file = e.target.files[0];
			setUploadedFile(file);

			// For text files, automatically load the content
			if (file.type === "text/plain") {
				const reader = new FileReader();
				reader.onload = (event) => {
					if (event.target?.result) {
						setContent(event.target.result as string);
					}
				};
				reader.readAsText(file);
			}
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const fileType = uploadedFile?.type || "text/plain";

		await createKnowledgeBase({
			name,
			description,
			content,
			fileType,
			// In a real implementation, the file would be uploaded to a storage service
			// and the URL would be returned, but for now we'll just use a placeholder
			fileUrl: uploadedFile ? `file://${uploadedFile.name}` : undefined,
		});

		handleCloseAddDialog();
	};

	const handleDeleteKnowledgeBase = async (id: string) => {
		if (confirm("Are you sure you want to delete this knowledge base?")) {
			await deleteKnowledgeBase(id);
		}
	};

	const loadingPlaceholderIds = [
		"placeholder-1",
		"placeholder-2",
		"placeholder-3",
	];

	return (
		<div className="container py-8">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="font-bold text-3xl">Knowledge Bases</h1>
				<Button onClick={handleOpenAddDialog}>
					<Plus className="mr-2 h-4 w-4" /> Add Knowledge
				</Button>
			</div>

			{isLoadingKnowledgeBases ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{loadingPlaceholderIds.map((id) => (
						<div
							key={id}
							className="h-48 animate-pulse rounded-lg border bg-muted"
						/>
					))}
				</div>
			) : knowledgeBases.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border bg-background p-12 text-center">
					<Database className="mb-2 h-12 w-12 text-muted-foreground" />
					<h2 className="mb-2 font-semibold text-xl">No knowledge bases yet</h2>
					<p className="mb-6 text-muted-foreground">
						Add your first knowledge base to enhance your agents with
						domain-specific knowledge.
					</p>
					<Button onClick={handleOpenAddDialog}>
						<Plus className="mr-2 h-4 w-4" /> Add Knowledge
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{knowledgeBases.map((kb) => (
						<div
							key={kb.id}
							className="group relative flex flex-col overflow-hidden rounded-lg border bg-background p-6 shadow transition-all hover:shadow-md"
						>
							<div className="mb-4 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<FileText className="h-5 w-5 text-primary" />
									<h3 className="font-semibold text-xl tracking-tight">
										{kb.name}
									</h3>
								</div>
								<Button
									variant="ghost"
									size="sm"
									className="opacity-0 group-hover:opacity-100"
									onClick={() => handleDeleteKnowledgeBase(kb.id)}
								>
									Delete
								</Button>
							</div>

							{kb.description && (
								<p className="mb-4 text-muted-foreground text-sm">
									{kb.description}
								</p>
							)}

							<div className="mt-auto flex items-center justify-between pt-4 text-sm">
								<span>
									{kb.fileType && (
										<span className="rounded-full bg-muted px-2 py-1 text-xs">
											{kb.fileType}
										</span>
									)}
								</span>
								<span className="text-muted-foreground">
									{new Date(kb.createdAt).toLocaleDateString()}
								</span>
							</div>
						</div>
					))}
				</div>
			)}

			<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>Add Knowledge Base</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmit}>
						<div className="grid gap-6 py-4">
							<div className="grid gap-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Product Manual"
									required
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="description">Description (Optional)</Label>
								<Input
									id="description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Knowledge about our products and services"
								/>
							</div>

							<div className="grid gap-2">
								<Label>Upload File or Enter Text</Label>
								<div
									className={`flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors ${
										dragActive ? "border-primary bg-primary/10" : "border-muted"
									}`}
									onDragEnter={handleDrag}
									onDragLeave={handleDrag}
									onDragOver={handleDrag}
									onDrop={handleDrop}
									onClick={() =>
										document.getElementById("file-upload")?.click()
									}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											document.getElementById("file-upload")?.click();
										}
									}}
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
								</div>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="content">Content</Label>
								<Textarea
									id="content"
									value={content}
									onChange={(e) => setContent(e.target.value)}
									placeholder="Enter text content or paste information here..."
									className="min-h-[200px]"
									required={!uploadedFile}
								/>
							</div>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={handleCloseAddDialog}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!name || (!content && !uploadedFile)}
							>
								Add Knowledge Base
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
