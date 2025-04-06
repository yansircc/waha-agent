import Link from "next/link";

import { LatestPost } from "@/app/_components/post";
import AIInput_07 from "@/components/ai-input";
import { auth } from "@/server/auth";
import { HydrateClient, api } from "@/trpc/server";
export default async function Home() {
	const hello = await api.post.hello({ text: "from tRPC" });
	const session = await auth();

	if (session?.user) {
		void api.post.getLatest.prefetch();
	}

	return (
		<HydrateClient>
			<p>{hello ? hello.greeting : "Loading tRPC query..."}</p>

			<div>
				<p>{session && <span>Logged in as {session.user?.name}</span>}</p>
				<Link href={session ? "/api/auth/signout" : "/api/auth/signin"}>
					{session ? "Sign out" : "Sign in"}
				</Link>
			</div>

			{session?.user && <LatestPost />}
			<AIInput_07 />
		</HydrateClient>
	);
}
