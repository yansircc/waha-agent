import { NeedAuthCard } from "@/components/need-auth-card";
import { auth } from "@/server/auth";
import InstancesClient from "./instances-client";

export default async function InstancesPage() {
	const session = await auth();

	if (!session) {
		return <NeedAuthCard />;
	}

	return <InstancesClient />;
}
