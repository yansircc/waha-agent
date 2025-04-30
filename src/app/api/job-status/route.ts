import { jinaCrawler } from "@/lib/jina";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const jobId = searchParams.get("jobId");

	if (!jobId) {
		return NextResponse.json(
			{ error: "Missing jobId parameter" },
			{ status: 400 },
		);
	}

	try {
		const job = await jinaCrawler.getJobStatus(jobId);

		if (!job) {
			return NextResponse.json({ error: "Job not found" }, { status: 404 });
		}

		return NextResponse.json({ job });
	} catch (error) {
		console.error("Error retrieving job status:", error);
		return NextResponse.json(
			{ error: "Failed to retrieve job status" },
			{ status: 500 },
		);
	}
}
