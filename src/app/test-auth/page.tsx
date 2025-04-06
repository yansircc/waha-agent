import { auth } from "@/server/auth";
import { SignInButton } from "./signin-button";
import { SignOutButton } from "./signout-button";

export default async function TestAuth() {
	const session = await auth();

	return (
		<div>
			<pre>{JSON.stringify(session, null, 2)}</pre>
			<a href="/api/auth/signin">Sign in</a>
			<a href="/api/auth/signout">Sign out</a>
		</div>
	);
}
