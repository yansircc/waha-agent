"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
	BookOpenIcon,
	MagnifyingGlassIcon,
	PlusIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

interface KnowledgeBase {
	id: string;
	name: string;
	description: string;
	createdAt: Date;
}

export default function KnowledgePage() {
	const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
	const [searchQuery, setSearchQuery] = useState("");

	return (
		<DashboardLayout>
			<div className="py-10">
				<header className="mb-8">
					<div className="mx-auto flex max-w-7xl justify-between px-4 sm:px-6 lg:px-8">
						<h1 className="font-bold text-3xl text-gray-900 leading-tight tracking-tight">
							Knowledge Base
						</h1>
						<Button className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 font-semibold text-sm text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2">
							<PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
							New Knowledge Base
						</Button>
					</div>
				</header>
				<main>
					<div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
						<div className="relative mb-6">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<MagnifyingGlassIcon
									className="h-5 w-5 text-gray-400"
									aria-hidden="true"
								/>
							</div>
							<input
								type="text"
								name="search"
								id="search"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset sm:text-sm sm:leading-6"
								placeholder="Search knowledge bases..."
							/>
						</div>

						{knowledgeBases.length === 0 ? (
							<div className="text-center">
								<BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
								<h3 className="mt-2 font-semibold text-gray-900 text-sm">
									No knowledge bases
								</h3>
								<p className="mt-1 text-gray-500 text-sm">
									Get started by creating a new knowledge base.
								</p>
								<div className="mt-6">
									<Button className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 font-semibold text-sm text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2">
										<PlusIcon
											className="-ml-0.5 mr-1.5 h-5 w-5"
											aria-hidden="true"
										/>
										New Knowledge Base
									</Button>
								</div>
							</div>
						) : (
							<ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
								{knowledgeBases.map((kb) => (
									<li
										key={kb.id}
										className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white shadow"
									>
										<div className="flex flex-1 flex-col p-8">
											<h3 className="font-medium text-gray-900 text-sm">
												{kb.name}
											</h3>
											<p className="mt-1 text-gray-500 text-sm">
												{kb.description}
											</p>
											<p className="mt-2 text-gray-400 text-xs">
												Created: {kb.createdAt.toLocaleDateString()}
											</p>
										</div>
										<div>
											<div className="-mt-px flex divide-x divide-gray-200">
												<div className="flex w-0 flex-1">
													<Button
														variant="ghost"
														className="-mr-px relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 font-semibold text-gray-900 text-sm"
													>
														View
													</Button>
												</div>
												<div className="-ml-px flex w-0 flex-1">
													<Button
														variant="ghost"
														className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 font-semibold text-gray-900 text-sm"
													>
														Edit
													</Button>
												</div>
											</div>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</main>
			</div>
		</DashboardLayout>
	);
}
