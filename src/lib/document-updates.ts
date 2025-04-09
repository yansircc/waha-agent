// Store recent document updates to allow client polling
const recentDocumentUpdates = new Map<
	string,
	{
		documentId: string;
		kbId: string;
		status: string;
		timestamp: number;
	}
>();

// Get recent document updates - this will be used by the polling endpoint
export function getRecentDocumentUpdates() {
	// Clean up old updates (older than 5 minutes)
	const now = Date.now();
	for (const [key, update] of recentDocumentUpdates.entries()) {
		if (now - update.timestamp > 5 * 60 * 1000) {
			recentDocumentUpdates.delete(key);
		}
	}

	return Array.from(recentDocumentUpdates.values());
}

// Store a document update
export function storeDocumentUpdate(
	documentId: string,
	kbId: string,
	status: string,
) {
	recentDocumentUpdates.set(documentId, {
		documentId,
		kbId,
		status,
		timestamp: Date.now(),
	});
}
