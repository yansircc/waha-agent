"use client";

import type { Agent } from "@/app/agents/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useEffect, useState } from "react";

interface AgentConfigDialogProps {
	open: boolean;
	onClose: () => void;
	onSave: (agent: Agent) => void;
	agent: Agent | null;
}

export function AgentConfigDialog({
	open,
	onClose,
	onSave,
	agent,
}: AgentConfigDialogProps) {
	const [name, setName] = useState("");
	const [prompt, setPrompt] = useState("");
	const [selectedKnowledgeBaseIds, setSelectedKnowledgeBaseIds] = useState<
		string[]
	>([]);
	const [knowledgeBaseInput, setKnowledgeBaseInput] = useState("");

	// Reset form when agent changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (agent) {
			setName(agent.name);
			setPrompt(agent.prompt);
			setSelectedKnowledgeBaseIds(agent.knowledgeBaseIds || []);
		} else {
			setName("");
			setPrompt("");
			setSelectedKnowledgeBaseIds([]);
		}
		setKnowledgeBaseInput("");
	}, [agent, open]);

	const handleSave = () => {
		if (!name || !prompt) return;

		onSave({
			id: agent?.id || "",
			name,
			prompt,
			knowledgeBaseIds: selectedKnowledgeBaseIds,
			createdAt: agent?.createdAt || new Date(),
		});
	};

	const handleAddKnowledgeBase = () => {
		if (
			knowledgeBaseInput &&
			!selectedKnowledgeBaseIds.includes(knowledgeBaseInput)
		) {
			setSelectedKnowledgeBaseIds([
				...selectedKnowledgeBaseIds,
				knowledgeBaseInput,
			]);
			setKnowledgeBaseInput("");
		}
	};

	const handleRemoveKnowledgeBase = (id: string) => {
		setSelectedKnowledgeBaseIds(
			selectedKnowledgeBaseIds.filter((kb) => kb !== id),
		);
	};

	return (
		<Transition.Root show={open} as={Fragment}>
			<Dialog as="div" className="relative z-50" onClose={onClose}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
				</Transition.Child>

				<div className="fixed inset-0 z-10 overflow-y-auto">
					<div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
							enterTo="opacity-100 translate-y-0 sm:scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 translate-y-0 sm:scale-100"
							leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
						>
							<Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
								<div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
									<button
										type="button"
										className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
										onClick={onClose}
									>
										<span className="sr-only">Close</span>
										<XMarkIcon className="h-6 w-6" aria-hidden="true" />
									</button>
								</div>
								<div>
									<div className="mt-3 text-center sm:mt-0 sm:text-left">
										<Dialog.Title
											as="h3"
											className="font-semibold text-gray-900 text-lg leading-6"
										>
											{agent ? "Edit Agent" : "Create New Agent"}
										</Dialog.Title>
										<div className="mt-6 space-y-6">
											<div>
												<Label htmlFor="agent-name">Agent Name</Label>
												<Input
													id="agent-name"
													value={name}
													onChange={(e) => setName(e.target.value)}
													placeholder="Customer Service Bot"
													className="mt-1"
													required
												/>
											</div>

											<div>
												<Label htmlFor="agent-prompt">Agent Prompt</Label>
												<Textarea
													id="agent-prompt"
													value={prompt}
													onChange={(e) => setPrompt(e.target.value)}
													placeholder="You are a helpful customer service agent for our company..."
													className="mt-1 min-h-32"
													required
												/>
											</div>

											<div>
												<Label htmlFor="knowledge-base">
													Knowledge Bases (Optional)
												</Label>
												<div className="mt-1 flex">
													<Input
														id="knowledge-base"
														value={knowledgeBaseInput}
														onChange={(e) =>
															setKnowledgeBaseInput(e.target.value)
														}
														placeholder="Enter knowledge base ID"
														className="flex-1"
													/>
													<Button
														type="button"
														onClick={handleAddKnowledgeBase}
														disabled={!knowledgeBaseInput}
														className="ml-2"
													>
														Add
													</Button>
												</div>
												{selectedKnowledgeBaseIds.length > 0 && (
													<div className="mt-2 flex flex-wrap gap-2">
														{selectedKnowledgeBaseIds.map((id) => (
															<div
																key={id}
																className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-800 text-sm"
															>
																{id}
																<button
																	type="button"
																	onClick={() => handleRemoveKnowledgeBase(id)}
																	className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-blue-800 hover:bg-blue-200 hover:text-blue-900 focus:bg-blue-500 focus:text-white focus:outline-none"
																>
																	<span className="sr-only">Remove {id}</span>
																	<XMarkIcon
																		className="h-3 w-3"
																		aria-hidden="true"
																	/>
																</button>
															</div>
														))}
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
								<div className="mt-8 sm:flex sm:flex-row-reverse">
									<Button
										type="button"
										onClick={handleSave}
										disabled={!name || !prompt}
										className="inline-flex w-full justify-center sm:ml-3 sm:w-auto"
									>
										{agent ? "Update" : "Create"}
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={onClose}
										className="mt-3 inline-flex w-full justify-center sm:mt-0 sm:w-auto"
									>
										Cancel
									</Button>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition.Root>
	);
}
