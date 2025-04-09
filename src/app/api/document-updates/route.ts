import { kbService } from "@/lib/kb-service";
import { auth } from "@/server/auth";
import { NextResponse } from "next/server";
import { getRecentDocumentUpdates } from "../webhooks/doc/route";

// This endpoint allows clients to poll for document status updates
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const documentIds = searchParams.get("documentIds");
	const sinceParam = searchParams.get("since");

	if (!documentIds) {
		return NextResponse.json(
			{ success: false, error: "Missing documentIds parameter" },
			{ status: 400 },
		);
	}

	// Parse the comma-separated document IDs
	const ids = documentIds.split(",");
	const since = sinceParam ? Number.parseInt(sinceParam, 10) : 0;

	try {
		// Get the session for auth
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 },
			);
		}

		// First check for recent updates in our in-memory storage
		const recentUpdates = getRecentDocumentUpdates().filter((update) =>
			ids.includes(update.documentId),
		);

		// If we have recent updates for all requested documents, return them
		if (recentUpdates.length === ids.length) {
			return NextResponse.json({
				success: true,
				documents: recentUpdates,
				timestamp: Date.now(),
			});
		}

		// For any documents without recent updates, fetch from the database
		const documentsToFetch = ids.filter(
			(id) => !recentUpdates.some((update) => update.documentId === id),
		);

		// Get the latest status for each remaining document from the database
		const dbDocuments = await Promise.all(
			documentsToFetch.map(async (id) => {
				try {
					const doc = await kbService.documents.getById(id, session.user.id);
					return doc
						? {
								documentId: doc.id,
								kbId: doc.kbId,
								status: doc.vectorizationStatus,
								timestamp: doc.updatedAt?.getTime() || Date.now(),
							}
						: null;
				} catch (e) {
					console.error(`Error fetching document ${id}:`, e);
					return null;
				}
			}),
		);

		// Combine recent updates with database fetched documents
		const allDocuments = [...recentUpdates, ...dbDocuments.filter(Boolean)];

		return NextResponse.json({
			success: true,
			documents: allDocuments,
			timestamp: Date.now(),
		});
	} catch (error) {
		console.error("Error fetching document updates:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch document updates" },
			{ status: 500 },
		);
	}
}
