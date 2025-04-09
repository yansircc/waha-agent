import { auth } from "@/server/auth";
import { type HandleDocPayload, handleDoc } from "@/trigger/handle-doc";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const session = await auth();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = (await request.json()) as Omit<HandleDocPayload, "userId">;

	if (body satisfies Omit<HandleDocPayload, "userId">) {
		await handleDoc.trigger({ ...body, userId: session.user.id });
	} else {
		return NextResponse.json(
			{ error: "Invalid request body" },
			{ status: 400 },
		);
	}

	return NextResponse.json({ success: true });
}
