import { NeedAuthCard } from "@/components/need-auth-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { formatDistance } from "date-fns";

export default async function Dashboard() {
	const session = await auth();

	if (!session) {
		return <NeedAuthCard />;
	}

	// Fetch data for dashboard
	const agents = await api.agents.getAll();
	const kbs = await api.kbs.getAll();
	const instances = await api.instances.getAll();
	const emails = await api.emails.getAll();

	return (
		<div className="space-y-6 py-8">
			<h1 className="font-bold text-3xl">仪表板</h1>
			<p className="text-gray-500">欢迎回来, {session.user?.name || "用户"}</p>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<DashboardCard
					title="AI机器人"
					count={agents.length}
					description="AI agents configured"
				/>
				<DashboardCard
					title="知识库"
					count={kbs.length}
					description="知识库创建"
				/>
				<DashboardCard
					title="WhatsApp账号"
					count={instances.length}
					description="WhatsApp账号"
				/>
				<DashboardCard
					title="邮件配置"
					count={emails.length}
					description="邮件配置设置"
				/>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>最近创建的AI机器人</CardTitle>
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
												模型: {agent.model}
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
							<p className="text-gray-500">还没有创建AI机器人</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>最近创建的WhatsApp账号</CardTitle>
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
												状态:{" "}
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
							<p className="text-gray-500">还没有创建WhatsApp账号</p>
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
