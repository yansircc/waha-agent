import { auth } from "@/server/auth";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { BulkCrawlForm } from "./bulk-crawl-form";

export default async function Home() {
	const session = await auth();

	if (!session) {
		return <div>请先登录</div>;
	}

	const userId = session.user.id;

	// 创建单个令牌，同时具有触发任务和读取结果的权限
	const publicToken = await triggerAuth.createPublicToken({
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

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="mx-auto max-w-4xl">
				<h1 className="mb-8 text-center font-bold text-2xl">
					Trigger.dev 爬虫演示
				</h1>

				<div className="w-full rounded-lg bg-white p-6 shadow">
					<BulkCrawlForm publicAccessToken={publicToken} userId={userId} />
				</div>
			</div>
		</div>
	);
}
