import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function HomeLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();

	if (!session) {
		redirect("/login");
	}

	return <>{children}</>;
}
