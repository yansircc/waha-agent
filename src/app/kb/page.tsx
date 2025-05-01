import { auth } from "@/server/auth";
import { KbClient } from "./kb-client";

export default async function KbPage() {
	const session = await auth();

	if (!session) {
		return <div>请先登录</div>;
	}

	const userId = session.user.id;

	return <KbClient userId={userId} />;
}
