import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
	const body = await request.json();
	console.log("body", body);
	return new Response("OK");
}

export async function GET() {
	return new Response("Hello World");
}
