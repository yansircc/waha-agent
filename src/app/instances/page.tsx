"use client";

import { Button } from "@/components/ui/button";
import type { InstanceStatus } from "@/types";
import { PlusIcon } from "lucide-react";
import { AddInstanceDialog } from "./components/add-instance-dialog";
import { EmptyState } from "./components/empty-state";
import { InstanceCard } from "./components/instance-card";
import { LoadingState } from "./components/loading-state";
import { useInstanceManager } from "./hooks/use-instance-manager";

export default function InstancesPage() {
	const {
		isAddOpen,
		setIsAddOpen,
		selectedAgentId,
		setSelectedAgentId,
		instances,
		isLoadingInstances,
		isApiLoading,
		agents,
		isLoadingAgents,
		handleOpenAddDialog,
		handleSubmit,
		handleDeleteInstance,
		handleScanQR,
		handleStartSession,
		handleStopSession,
		handleLogoutSession,
		handleRefreshSession,
	} = useInstanceManager();

	return (
		<div className="container py-8">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="font-bold text-3xl">WhatsApp账号</h1>
				<Button onClick={handleOpenAddDialog} disabled={isApiLoading}>
					<PlusIcon className="mr-2 h-4 w-4" /> 添加账号
				</Button>
			</div>

			{isLoadingInstances || isApiLoading ? (
				<LoadingState />
			) : instances.length === 0 ? (
				<EmptyState onAddInstance={handleOpenAddDialog} />
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
							onScanQR={() => handleScanQR(instance)}
							onStart={() => handleStartSession(instance)}
							onStop={() => handleStopSession(instance)}
							onLogout={() => handleLogoutSession(instance)}
							onRefresh={() => handleRefreshSession(instance)}
						/>
					))}
				</div>
			)}

			<AddInstanceDialog
				open={isAddOpen}
				onOpenChange={setIsAddOpen}
				onSubmit={handleSubmit}
				selectedAgentId={selectedAgentId}
				setSelectedAgentId={setSelectedAgentId}
				isLoading={isApiLoading}
				agents={agents}
				isLoadingAgents={isLoadingAgents}
			/>
		</div>
	);
}
