import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { formatDistance } from "date-fns";
import Link from "next/link";

export default async function Dashboard() {
	const session = await auth();

	if (!session) {
		return (
			<div className="flex h-[80vh] items-center justify-center">
				<Card className="w-full max-w-lg">
					<CardHeader>
						<CardTitle>Authentication Required</CardTitle>
						<CardDescription>
							Please sign in to access the dashboard.
							<Button asChild variant="link">
								<Link href="/api/auth/signin">Sign in</Link>
							</Button>
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	// Fetch data for dashboard
	const agents = await api.agents.getAll();
	const kbs = await api.kbs.getAll();
	const instances = await api.instances.getAll();
	const emails = await api.emails.getAll();

	return (
		<div className="space-y-6 py-8">
			<h1 className="font-bold text-3xl">Dashboard</h1>
			<p className="text-gray-500">
				Welcome back, {session.user?.name || "User"}
			</p>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<DashboardCard
					title="Agents"
					count={agents.length}
					description="AI agents configured"
				/>
				<DashboardCard
					title="Knowledge Bases"
					count={kbs.length}
					description="Knowledge bases created"
				/>
				<DashboardCard
					title="Instances"
					count={instances.length}
					description="WhatsApp instances"
				/>
				<DashboardCard
					title="Email Configs"
					count={emails.length}
					description="Email configs set up"
				/>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Recent Agents</CardTitle>
						<CardDescription>Recently created AI agents</CardDescription>
					</CardHeader>
					<CardContent>
						{agents.length > 0 ? (
							<ul className="space-y-2">
								{agents.slice(0, 5).map((agent) => (
									<li
										key={agent.id}
										className="flex items-center justify-between"
									>
										<div>
											<p className="font-medium">{agent.name}</p>
											<p className="text-gray-500 text-sm">
												Model: {agent.model}
											</p>
										</div>
										<p className="text-gray-500 text-xs">
											{formatDistance(new Date(agent.createdAt), new Date(), {
												addSuffix: true,
											})}
										</p>
									</li>
								))}
							</ul>
						) : (
							<p className="text-gray-500">No agents created yet</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent Instances</CardTitle>
						<CardDescription>
							Recently created WhatsApp instances
						</CardDescription>
					</CardHeader>
					<CardContent>
						{instances.length > 0 ? (
							<ul className="space-y-2">
								{instances.slice(0, 5).map((instance) => (
									<li
										key={instance.id}
										className="flex items-center justify-between"
									>
										<div>
											<p className="font-medium">{instance.name}</p>
											<p className="text-gray-500 text-sm">
												Status:{" "}
												<span
													className={`${instance.status === "connected" ? "text-green-500" : "text-amber-500"}`}
												>
													{instance.status}
												</span>
											</p>
										</div>
										<p className="text-gray-500 text-xs">
											{formatDistance(
												new Date(instance.createdAt),
												new Date(),
												{ addSuffix: true },
											)}
										</p>
									</li>
								))}
							</ul>
						) : (
							<p className="text-gray-500">No instances created yet</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function DashboardCard({
	title,
	count,
	description,
}: {
	title: string;
	count: number;
	description: string;
}) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="font-medium text-gray-500 text-sm">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="font-bold text-2xl">{count}</div>
				<p className="mt-1 text-gray-500 text-xs">{description}</p>
			</CardContent>
		</Card>
	);
}
