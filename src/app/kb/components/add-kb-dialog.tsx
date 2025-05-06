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
import { Loader2 } from "lucide-react";
import { useAddKbDialog } from "../hooks/use-add-kb-dialog";

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
	const {
		name,
		setName,
		description,
		setDescription,
		isSubmitting,
		handleSubmit: hookHandleSubmit,
		handleClose,
	} = useAddKbDialog();

	// 当使用外部传入的回调时的处理
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSubmit({ name, description });
		handleClose();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>添加知识库</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-6 py-4">
						<div className="grid gap-2">
							<Label htmlFor="kb-name">名称</Label>
							<Input
								id="kb-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="产品手册"
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="kb-description">描述 (可选)</Label>
							<Input
								id="kb-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="我们的产品和服务知识"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							取消
						</Button>
						<Button type="submit" disabled={!name || isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									创建中...
								</>
							) : (
								"创建知识库"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
