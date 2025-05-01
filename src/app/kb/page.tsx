import { auth } from "@/server/auth";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { KbClient } from "./kb-client";

export default async function KbPage() {
	const session = await auth();

	if (!session) {
		return <div>请先登录</div>;
	}

	const userId = session.user.id;

	const publicAccessToken = await triggerAuth.createPublicToken({
		scopes: {
			trigger: {
				tasks: "bulk-crawl",
			},
			read: {
				tags: [`user-${userId}`],
			},
		},
		expirationTime: "1d",
	});

	return <KbClient publicAccessToken={publicAccessToken} userId={userId} />;
}
