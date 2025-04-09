"use client";

import { Button } from "@/components/ui/button";
import { type LucideIcon, Plus } from "lucide-react";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	actionLabel: string;
	onAction: () => void;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	actionLabel,
	onAction,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center rounded-lg border bg-background p-12 text-center">
			<Icon className="mb-2 h-12 w-12 text-muted-foreground" />
			<h2 className="mb-2 font-semibold text-xl">{title}</h2>
			<p className="mb-6 text-muted-foreground">{description}</p>
			<Button onClick={onAction}>
				<Plus className="mr-2 h-4 w-4" /> {actionLabel}
			</Button>
		</div>
	);
}
