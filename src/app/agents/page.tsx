"use client";

import { AgentCard } from "@/components/agents/agent-card";
import { AgentConfigDialog } from "@/components/agents/agent-config-dialog";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export type Agent = {
	id: string;
	name: string;
	prompt: string;
	knowledgeBaseIds: string[];
	createdAt: Date;
};

export default function AgentsPage() {
	const [agents, setAgents] = useState<Agent[]>([]);
	const [isConfigOpen, setIsConfigOpen] = useState(false);
	const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

	const handleCreateAgent = () => {
		setEditingAgent(null);
		setIsConfigOpen(true);
	};

	const handleEditAgent = (agent: Agent) => {
		setEditingAgent(agent);
		setIsConfigOpen(true);
	};

	const handleSaveAgent = (agent: Agent) => {
		if (editingAgent) {
			// Update existing agent
			setAgents(agents.map((a) => (a.id === agent.id ? agent : a)));
		} else {
			// Create new agent
			const newAgent = {
				...agent,
				id: crypto.randomUUID(),
				createdAt: new Date(),
			};
			setAgents([...agents, newAgent]);
		}
		setIsConfigOpen(false);
	};

	const handleDeleteAgent = (id: string) => {
		setAgents(agents.filter((agent) => agent.id !== id));
	};

	return (
		<DashboardLayout>
			<div className="py-10">
				<header className="mb-8">
					<div className="mx-auto flex max-w-7xl justify-between px-4 sm:px-6 lg:px-8">
						<h1 className="font-bold text-3xl text-gray-900 leading-tight tracking-tight">
							AI Agents
						</h1>
						<Button
							onClick={handleCreateAgent}
							className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 font-semibold text-sm text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2"
						>
							<PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
							New Agent
						</Button>
					</div>
				</header>
				<main>
					<div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
						{agents.length === 0 ? (
							<div className="text-center">
								<svg
									className="mx-auto h-12 w-12 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
									/>
								</svg>
								<h3 className="mt-2 font-semibold text-gray-900 text-sm">
									No agents
								</h3>
								<p className="mt-1 text-gray-500 text-sm">
									Get started by creating a new agent.
								</p>
								<div className="mt-6">
									<Button
										onClick={handleCreateAgent}
										className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 font-semibold text-sm text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2"
									>
										<PlusIcon
											className="-ml-0.5 mr-1.5 h-5 w-5"
											aria-hidden="true"
										/>
										New Agent
									</Button>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{agents.map((agent) => (
									<AgentCard
										key={agent.id}
										agent={agent}
										onEdit={() => handleEditAgent(agent)}
										onDelete={() => handleDeleteAgent(agent.id)}
									/>
								))}
							</div>
						)}
					</div>
				</main>
			</div>

			<AgentConfigDialog
				open={isConfigOpen}
				onClose={() => setIsConfigOpen(false)}
				onSave={handleSaveAgent}
				agent={editingAgent}
			/>
		</DashboardLayout>
	);
}
