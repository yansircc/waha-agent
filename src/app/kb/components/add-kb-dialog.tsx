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
import { useState } from "react";

interface AddKbDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { name: string; description: string }) => Promise<void>;
}

export function AddKbDialog({
	open,
	onOpenChange,
	onSubmit,
}: AddKbDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSubmit({ name, description });
		handleClose();
	};

	const handleClose = () => {
		onOpenChange(false);
		setName("");
		setDescription("");
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Add Knowledge Base</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-6 py-4">
						<div className="grid gap-2">
							<Label htmlFor="kb-name">Name</Label>
							<Input
								id="kb-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Product Manual"
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="kb-description">Description (Optional)</Label>
							<Input
								id="kb-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Knowledge about our products and services"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={!name}>
							Create Knowledge Base
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
