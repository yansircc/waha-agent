"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneIcon, PlusIcon, QrCodeIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

interface Instance {
	id: string;
	name: string;
	phoneNumber: string;
	status: "connected" | "disconnected" | "connecting";
	agentId: string | null;
	agentName: string | null;
	createdAt: Date;
}

export default function InstancesPage() {
	const [instances, setInstances] = useState<Instance[]>([
		{
			id: "1",
			name: "Demo Instance",
			phoneNumber: "+1234567890",
			status: "connected",
			agentId: "agent-123",
			agentName: "Customer Service Bot",
			createdAt: new Date(),
		},
	]);

	const getStatusColor = (status: Instance["status"]) => {
		switch (status) {
			case "connected":
				return "bg-green-100 text-green-800 ring-green-600/20";
			case "disconnected":
				return "bg-red-100 text-red-800 ring-red-600/20";
			case "connecting":
				return "bg-yellow-100 text-yellow-800 ring-yellow-600/20";
			default:
				return "bg-gray-100 text-gray-800 ring-gray-600/20";
		}
	};

	return (
		<DashboardLayout>
			<div className="py-10">
				<header className="mb-8">
					<div className="mx-auto flex max-w-7xl justify-between px-4 sm:px-6 lg:px-8">
						<h1 className="font-bold text-3xl text-gray-900 leading-tight tracking-tight">
							WhatsApp Instances
						</h1>
						<Button className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 font-semibold text-sm text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2">
							<PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
							New Instance
						</Button>
					</div>
				</header>
				<main>
					<div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
						{instances.length === 0 ? (
							<div className="text-center">
								<PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
								<h3 className="mt-2 font-semibold text-gray-900 text-sm">
									No instances
								</h3>
								<p className="mt-1 text-gray-500 text-sm">
									Get started by creating a new WhatsApp instance.
								</p>
								<div className="mt-6">
									<Button className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 font-semibold text-sm text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2">
										<PlusIcon
											className="-ml-0.5 mr-1.5 h-5 w-5"
											aria-hidden="true"
										/>
										New Instance
									</Button>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{instances.map((instance) => (
									<div
										key={instance.id}
										className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow"
									>
										<div className="flex flex-col p-6">
											<div className="flex items-center justify-between">
												<h3 className="truncate font-medium text-gray-900 text-lg">
													{instance.name}
												</h3>
												<Badge className={getStatusColor(instance.status)}>
													{instance.status}
												</Badge>
											</div>
											<div className="mt-2 flex items-center text-gray-500 text-sm">
												<PhoneIcon
													className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
													aria-hidden="true"
												/>
												{instance.phoneNumber || "No phone number"}
											</div>
											<div className="mt-4 space-y-3">
												<div>
													<h4 className="font-medium text-gray-500 text-sm">
														Connected Agent
													</h4>
													<p className="mt-1 font-medium text-gray-900 text-sm">
														{instance.agentName || "No agent connected"}
													</p>
												</div>
												<div>
													<h4 className="font-medium text-gray-500 text-sm">
														Created
													</h4>
													<p className="mt-1 text-gray-900 text-sm">
														{instance.createdAt.toLocaleDateString()}
													</p>
												</div>
											</div>
										</div>
										<div>
											<div className="-mt-px flex divide-x divide-gray-200">
												<div className="flex w-0 flex-1">
													<Button
														variant="ghost"
														className="-mr-px relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 font-semibold text-gray-900 text-sm"
													>
														<QrCodeIcon
															className="h-5 w-5 text-gray-400"
															aria-hidden="true"
														/>
														Scan QR
													</Button>
												</div>
												<div className="-ml-px flex w-0 flex-1">
													<Button
														variant="ghost"
														className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 font-semibold text-gray-900 text-sm"
													>
														Configure
													</Button>
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</main>
			</div>
		</DashboardLayout>
	);
}
