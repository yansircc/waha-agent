import { cleanupOldJobs } from "@/lib/queue/session-queue";
import { NextResponse } from "next/server";

// This should be run every hour to clean up old queue jobs
export async function GET() {
	try {
		// Clean up jobs older than 1 hour
		const count = await cleanupOldJobs(1);
		return NextResponse.json({ success: true, count });
	} catch (error) {
		console.error("Failed to clean up session queue:", error);
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}

// Export a route configuration for cron jobs
export const dynamic = "force-dynamic";
export const revalidate = 0;
