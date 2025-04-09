import { storeDocumentUpdate } from "@/lib/document-updates";
import { kbService } from "@/lib/kb-service";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
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

	if (!documentId || !kbId) {
		return NextResponse.json(
			{ success: false, error: "Missing document ID or KB ID" },
			{ status: 400 },
		);
	}

	try {
		// First, get the document to find its owner
		const doc = await db.query.documents.findFirst({
			where: eq(documents.id, documentId),
			with: {
				kb: true,
			},
		});

		if (!doc) {
			return NextResponse.json(
				{ success: false, error: "Document not found" },
				{ status: 404 },
			);
		}

		const userId = doc.kb.createdById;

		// Update the document status in the database
		const status = success ? "completed" : "failed";
		const metadata = success
			? {
					...(doc.metadata as Record<string, unknown>),
					chunkCount,
					collectionName,
					vectorizedAt: new Date().toISOString(),
				}
			: {
					...(doc.metadata as Record<string, unknown>),
					vectorizationError: error || "Unknown error",
				};

		console.log(
			`Updating document ${documentId} status from "${doc.vectorizationStatus}" to "${status}"`,
		);

		const updatedDoc = await kbService.documents.update({
			id: documentId,
			kbId,
			vectorizationStatus: status,
			metadata,
			userId,
		});

		console.log(`Document ${documentId} updated:`, {
			previousStatus: doc.vectorizationStatus,
			newStatus: updatedDoc.vectorizationStatus,
			metadata: updatedDoc.metadata,
		});

		// Store this update for polling clients
		storeDocumentUpdate(documentId, kbId, status);

		// Revalidate the /kb route and all its sub-routes
		revalidatePath("/kb");

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error updating document status:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update document status" },
			{ status: 500 },
		);
	}
}
