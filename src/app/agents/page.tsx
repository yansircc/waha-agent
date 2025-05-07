import { NeedAuthCard } from "@/components/need-auth-card";
import { auth } from "@/server/auth";
import AgentsClient from "./agent-client";

export default async function AgentsPage() {
	const session = await auth();

	if (!session) {
		return <NeedAuthCard />;
	}

	return <AgentsClient />;
}
