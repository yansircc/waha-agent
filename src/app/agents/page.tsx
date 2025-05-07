"use client";

import { useKbApi } from "@/app/kb/hooks";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/types/agents";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AgentCard } from "./components/agent-card";
import { AgentConfigDialog } from "./components/agent-config-dialog";
import { useAgents } from "./hooks/use-agents";

export default function AgentsPage() {
	const [isCreatingAgent, setIsCreatingAgent] = useState(false);
	const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

	const { agents, isLoadingAgents, createAgent, updateAgent, deleteAgent } =
		useAgents();
	const { kbs } = useKbApi();

	const handleOpenCreateDialog = () => {
		setIsCreatingAgent(true);
	};

	const handleOpenEditDialog = (agentId: string) => {
		setEditingAgentId(agentId);
	};

	const handleCloseDialog = () => {
		setIsCreatingAgent(false);
		setEditingAgentId(null);
	};

	const handleSubmit = (data: Agent) => {
		if (data.id) {
			updateAgent({
				id: data.id,
				apiKey: data.apiKey,
				name: data.name,
				prompt: data.prompt,
				model: data.model,
				kbIds: data.kbIds,
				createdAt: data.createdAt,
				updatedAt: data.updatedAt,
			});
		} else {
			createAgent({
				id: data.id,
				apiKey: data.apiKey,
				name: data.name,
				prompt: data.prompt,
				model: data.model,
				kbIds: data.kbIds,
				createdAt: data.createdAt,
				updatedAt: data.updatedAt,
			});
		}
		handleCloseDialog();
	};

	const handleDeleteAgent = (agentId: string) => {
		if (window.confirm("Are you sure you want to delete this agent?")) {
			deleteAgent(agentId);
		}
	};

	const editingAgent = editingAgentId
		? agents.find((agent) => agent.id === editingAgentId)
		: null;

	const formDefaultValues = editingAgent
		? {
				id: editingAgent.id,
				apiKey: editingAgent.apiKey,
				name: editingAgent.name,
				prompt: editingAgent.prompt,
				model: editingAgent.model,
				kbIds: editingAgent.kbIds,
				createdAt: editingAgent.createdAt,
				updatedAt: editingAgent.updatedAt,
			}
		: undefined;

	const loadingPlaceholderIds = [
		"placeholder-1",
		"placeholder-2",
		"placeholder-3",
	];

	return (
		<div className="container py-8">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="font-bold text-3xl">机器人</h1>
				<Button onClick={handleOpenCreateDialog}>
					<Plus className="mr-2 h-4 w-4" /> 创建机器人
				</Button>
			</div>

			{isLoadingAgents ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{loadingPlaceholderIds.map((id) => (
						<div
							key={id}
							className="h-64 animate-pulse rounded-lg border bg-muted"
						/>
					))}
				</div>
			) : agents.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border bg-background p-12 text-center">
					<h2 className="mb-2 font-semibold text-xl">没有机器人</h2>
					<p className="mb-6 text-muted-foreground">
						创建你的第一个AI机器人以开始自动回复WhatsApp消息。
					</p>
					<Button onClick={handleOpenCreateDialog}>
						<Plus className="mr-2 h-4 w-4" /> 创建机器人
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{agents.map((agent) => (
						<AgentCard
							key={agent.id}
							agent={agent}
							kbs={kbs.filter((kb) => agent.kbIds?.includes(kb.id))}
							onEdit={() => handleOpenEditDialog(agent.id)}
							onDelete={() => handleDeleteAgent(agent.id)}
						/>
					))}
				</div>
			)}

			{(isCreatingAgent || editingAgentId) && (
				<AgentConfigDialog
					open={isCreatingAgent || !!editingAgentId}
					onOpenChange={handleCloseDialog}
					onSubmit={handleSubmit}
					kbs={kbs}
					defaultValues={formDefaultValues}
					mode={editingAgentId ? "edit" : "create"}
				/>
			)}
		</div>
	);
}
