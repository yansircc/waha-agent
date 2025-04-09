import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

interface WebhookResponse {
	success: boolean;
	kbId?: string;
	documentId?: string;
	collectionName?: string;
	error?: string;
	chunkCount?: number;
}

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { success, kbId, documentId, collectionName, error, chunkCount } =
		body as WebhookResponse;

	console.log({ success, kbId, documentId, collectionName, error, chunkCount });

	if (success) {
		// Revalidate the /kb route and all its sub-routes
		revalidatePath("/kb");
	}

	return NextResponse.json({ success: true });
}
