import { AgentQueryDialog } from "@/components/agent-query-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
	params: {
		id: string;
	};
}

export default async function AgentDetailsPage({ params }: PageProps) {
	const session = await auth();
	if (!session?.user) {
		notFound();
	}

	const agent = await db.query.agents.findFirst({
		where: (agent, { eq, and }) =>
			and(eq(agent.id, params.id), eq(agent.createdById, session.user.id)),
		with: {
			knowledgeBases: {
				with: {
					knowledgeBase: true,
				},
			},
		},
	});

	if (!agent) {
		notFound();
	}

	// Transform the result to include knowledgeBase objects
	const agentData = {
		...agent,
		knowledgeBases: agent.knowledgeBases.map(
			(relation) => relation.knowledgeBase,
		),
	};

	return (
		<div className="container py-8">
			<div className="mb-8 flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<Button variant="outline" size="icon" asChild>
						<Link href="/agents">
							<ArrowLeft className="h-4 w-4" />
							<span className="sr-only">Back to agents</span>
						</Link>
					</Button>
					<h1 className="font-bold text-2xl">{agentData.name}</h1>
					{agentData.isActive && (
						<Badge variant="secondary" className="bg-green-100 text-green-800">
							Active
						</Badge>
					)}
				</div>
				<AgentQueryDialog
					agentId={agentData.id}
					agentName={agentData.name}
					trigger={
						<Button>
							<Search className="mr-2 h-4 w-4" />
							Query with this Agent
						</Button>
					}
				/>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Agent Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<h3 className="font-semibold">Created</h3>
							<p className="text-muted-foreground text-sm">
								{agentData.createdAt
									? new Date(agentData.createdAt).toLocaleString()
									: "Unknown"}
							</p>
						</div>
						<div>
							<h3 className="font-semibold">Updated</h3>
							<p className="text-muted-foreground text-sm">
								{agentData.updatedAt
									? new Date(agentData.updatedAt).toLocaleString()
									: "Unknown"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Knowledge Bases</CardTitle>
					</CardHeader>
					<CardContent>
						{agentData.knowledgeBases.length > 0 ? (
							<ul className="space-y-2">
								{agentData.knowledgeBases.map((kb) => (
									<li key={kb.id} className="flex items-center justify-between">
										<span>{kb.name}</span>
										<Button variant="ghost" size="sm" asChild>
											<Link href={`/kb/${kb.id}`}>View</Link>
										</Button>
									</li>
								))}
							</ul>
						) : (
							<p className="text-muted-foreground text-sm">
								No knowledge bases connected to this agent.
							</p>
						)}
					</CardContent>
				</Card>

				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle>Prompt</CardTitle>
					</CardHeader>
					<CardContent>
						<pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
							{agentData.prompt}
						</pre>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
