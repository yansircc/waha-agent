import { NeedAuthCard } from "@/components/need-auth-card";
import { auth } from "@/server/auth";
import { KbClient } from "./kb-client";

export default async function KbPage() {
	const session = await auth();

	if (!session) {
		return <NeedAuthCard />;
	}

	const userId = session.user.id;

	return <KbClient userId={userId} />;
}
