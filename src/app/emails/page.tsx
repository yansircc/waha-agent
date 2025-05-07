import { NeedAuthCard } from "@/components/need-auth-card";
import { auth } from "@/server/auth";
import EmailsClient from "./emails-client";

export default async function EmailsPage() {
	const session = await auth();

	if (!session) {
		return <NeedAuthCard />;
	}

	return <EmailsClient />;
}
