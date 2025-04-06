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
import { useAgents } from "@/hooks/use-agents";
import { useInstances } from "@/hooks/use-instances";
import type { instances } from "@/server/db/schema";
import { PhoneIcon, PlusIcon, QrCodeIcon } from "lucide-react";
import { useState } from "react";

type InstanceStatus = "connected" | "disconnected" | "connecting";

interface InstanceCardProps {
	id: string;
	name: string;
	phoneNumber?: string;
	agentName?: string;
	status: InstanceStatus;
	qrCode?: string;
	onDelete?: () => void;
}

function InstanceCard({
	id,
	name,
	phoneNumber,
	agentName,
	status,
	qrCode,
	onDelete,
}: InstanceCardProps) {
	const getStatusColor = (status: InstanceStatus) => {
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
		<div className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow">
			<div className="flex flex-col p-6">
				<div className="flex items-center justify-between">
					<h3 className="truncate font-medium text-gray-900 text-lg">{name}</h3>
					<Badge className={getStatusColor(status)}>{status}</Badge>
				</div>
				<div className="mt-2 flex items-center text-gray-500 text-sm">
					<PhoneIcon
						className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
						aria-hidden="true"
					/>
					{phoneNumber || "No phone number"}
				</div>
				<div className="mt-4 space-y-3">
					<div>
						<h4 className="font-medium text-gray-500 text-sm">
							Connected Agent
						</h4>
						<p className="mt-1 font-medium text-gray-900 text-sm">
							{agentName || "No agent connected"}
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
	);
}

export default function InstancesPage() {
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [instanceName, setInstanceName] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [selectedAgentId, setSelectedAgentId] = useState("");

	const { instances, isLoadingInstances, createInstance, deleteInstance } =
		useInstances();
	const { agents, isLoadingAgents } = useAgents();

	const handleOpenAddDialog = () => setIsAddOpen(true);

	const handleCloseAddDialog = () => {
		setIsAddOpen(false);
		resetForm();
	};

	const resetForm = () => {
		setInstanceName("");
		setPhoneNumber("");
		setSelectedAgentId("");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		await createInstance({
			name: instanceName,
			phoneNumber: phoneNumber || undefined,
			agentId: selectedAgentId || undefined,
		});

		handleCloseAddDialog();
	};

	const handleDeleteInstance = async (id: string) => {
		if (window.confirm("Are you sure you want to delete this instance?")) {
			await deleteInstance(id);
		}
	};

	return (
		<div className="container py-8">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="font-bold text-3xl">WhatsApp Instances</h1>
				<Button onClick={handleOpenAddDialog}>
					<PlusIcon className="mr-2 h-4 w-4" /> Add Instance
				</Button>
			</div>

			{isLoadingInstances ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<div
							key={`loading-${i}`}
							className="h-64 animate-pulse rounded-lg border bg-muted"
						/>
					))}
				</div>
			) : instances.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border bg-background p-12 text-center">
					<PhoneIcon className="mb-4 h-12 w-12 text-muted-foreground" />
					<h2 className="mb-2 font-semibold text-xl">No WhatsApp instances</h2>
					<p className="mb-6 text-muted-foreground">
						Connect WhatsApp to your AI agents by creating a new instance.
					</p>
					<Button onClick={handleOpenAddDialog}>
						<PlusIcon className="mr-2 h-4 w-4" /> Add Instance
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{instances.map((instance) => (
						<InstanceCard
							key={instance.id}
							id={instance.id}
							name={instance.name}
							phoneNumber={instance.phoneNumber || undefined}
							agentName={instance.agent?.name}
							status={instance.status as InstanceStatus}
							qrCode={instance.qrCode || undefined}
							onDelete={() => handleDeleteInstance(instance.id)}
						/>
					))}
				</div>
			)}

			<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Add WhatsApp Instance</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmit}>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="name">Instance Name</Label>
								<Input
									id="name"
									value={instanceName}
									onChange={(e) => setInstanceName(e.target.value)}
									placeholder="My WhatsApp"
									required
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="phone">Phone Number (optional)</Label>
								<Input
									id="phone"
									value={phoneNumber}
									onChange={(e) => setPhoneNumber(e.target.value)}
									placeholder="+1234567890"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="agent">Agent (optional)</Label>
								<select
									id="agent"
									value={selectedAgentId}
									onChange={(e) => setSelectedAgentId(e.target.value)}
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
									<option value="">Select an agent</option>
									{!isLoadingAgents &&
										agents.map((agent) => (
											<option key={agent.id} value={agent.id}>
												{agent.name}
											</option>
										))}
								</select>
							</div>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={handleCloseAddDialog}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={!instanceName}>
								Add Instance
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
