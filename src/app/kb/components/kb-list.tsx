"use client";

import { Button } from "@/components/ui/button";
import type { Kb } from "@/types/kb";
import {
	ChevronRight,
	Database,
	FilesIcon,
	Folder,
	Search,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "./empty-state";
import { KbSearchDialog } from "./kb-search-dialog";

interface KbListProps {
	kbs: Kb[];
	isLoading: boolean;
	onAdd: () => void;
	onDelete: (id: string) => void;
	onSelect: (kb: Kb) => void;
}

export function KbList({
	kbs,
	isLoading,
	onAdd,
	onDelete,
	onSelect,
}: KbListProps) {
	const [searchDialogOpen, setSearchDialogOpen] = useState(false);
	const [selectedKbForSearch, setSelectedKbForSearch] = useState<Kb | null>(
		null,
	);

	// Loading placeholders
	const loadingPlaceholderIds = [
		"placeholder-1",
		"placeholder-2",
		"placeholder-3",
	];

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{loadingPlaceholderIds.map((id) => (
					<div
						key={id}
						className="h-48 animate-pulse rounded-lg border bg-muted"
					/>
				))}
			</div>
		);
	}

	if (kbs.length === 0) {
		return (
			<EmptyState
				icon={Database}
				title="没有知识库"
				description="添加你的第一个知识库以增强你的机器人的领域特定知识。"
				actionLabel="添加知识库"
				onAction={onAdd}
			/>
		);
	}

	return (
		<>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{kbs.map((kb) => (
					<div
						key={kb.id}
						className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-background p-6 shadow transition-all hover:shadow-md"
						onClick={() => onSelect(kb)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onSelect(kb);
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
							<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
								<Button
									variant="ghost"
									size="sm"
									onClick={(e) => {
										e.stopPropagation();
										setSelectedKbForSearch(kb);
										setSearchDialogOpen(true);
									}}
								>
									<Search className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={(e) => {
										e.stopPropagation();
										onDelete(kb.id);
									}}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{kb.description && (
							<p className="mb-4 text-muted-foreground text-sm">
								{kb.description}
							</p>
						)}

						<div className="mt-auto flex items-center justify-between pt-4 text-sm">
							<span className="flex items-center gap-1">
								<FilesIcon className="h-4 w-4" />
								{kb.documents?.length || 0} 文档
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

			{selectedKbForSearch && (
				<KbSearchDialog
					kb={selectedKbForSearch}
					open={searchDialogOpen}
					onOpenChange={setSearchDialogOpen}
				/>
			)}
		</>
	);
}
