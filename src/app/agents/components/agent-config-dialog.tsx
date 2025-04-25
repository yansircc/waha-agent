"use client";

import { Badge } from "@/components/ui/badge";
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
import type { Agent } from "@/types/agents";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

interface Kb {
	id: string;
	name: string;
}

interface AgentConfigDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: Agent) => void;
	kbs?: Kb[];
	defaultValues?: Agent;
	mode?: "create" | "edit";
}

export function AgentConfigDialog({
	open,
	onOpenChange,
	onSubmit,
	kbs = [],
	defaultValues,
	mode = "create",
}: AgentConfigDialogProps) {
	const [apiKey, setApiKey] = useState(defaultValues?.apiKey || "");
	const [name, setName] = useState(defaultValues?.name || "");
	const [prompt, setPrompt] = useState(defaultValues?.prompt || "");
	const [model, setModel] = useState(defaultValues?.model || "gpt-4o");
	const [selectedKbIds, setSelectedKbIds] = useState<string[]>(
		defaultValues?.kbIds || [],
	);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			onSubmit({
				id: defaultValues?.id || "",
				apiKey,
				name,
				prompt,
				model,
				kbIds: selectedKbIds,
				createdAt: defaultValues?.createdAt || null,
				updatedAt: defaultValues?.updatedAt || null,
			});
		} finally {
			setIsLoading(false);
		}
	};

	const toggleKb = (kbId: string) => {
		setSelectedKbIds((prev) =>
			prev.includes(kbId) ? prev.filter((id) => id !== kbId) : [...prev, kbId],
		);
	};

	const modeTitle = mode === "create" ? "创建新机器人" : "编辑机器人";
	const actionLabel = mode === "create" ? "创建" : "更新";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>{modeTitle}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-6 py-4">
						<div className="grid gap-2">
							<Label htmlFor="apiKey">API Key</Label>
							<Input
								id="apiKey"
								value={apiKey}
								onChange={(e) => setApiKey(e.target.value)}
								placeholder="sk-..."
								type="password"
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="name">名称</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="客户服务机器人"
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="model">模型</Label>
							<Input
								id="model"
								value={model}
								onChange={(e) => setModel(e.target.value)}
								placeholder="gpt-4o"
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="prompt">系统提示</Label>
							<Textarea
								id="prompt"
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								placeholder="你是一个有用的客户服务机器人..."
								className="min-h-[120px]"
								required
							/>
						</div>

						{kbs.length > 0 && (
							<div className="grid gap-2">
								<Label>知识库</Label>
								<div className="flex flex-wrap gap-2">
									{kbs.map((kb) => (
										<Badge
											key={kb.id}
											variant={
												selectedKbIds.includes(kb.id) ? "default" : "outline"
											}
											className="cursor-pointer"
											onClick={() => toggleKb(kb.id)}
										>
											{kb.name}
											{selectedKbIds.includes(kb.id) && (
												<CheckIcon className="ml-1 h-3 w-3" />
											)}
										</Badge>
									))}
								</div>
								<p className="text-muted-foreground text-xs">
									选择知识库以连接到这个机器人
								</p>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							取消
						</Button>
						<Button type="submit" disabled={!name || !prompt || isLoading}>
							{isLoading ? "保存中..." : actionLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
