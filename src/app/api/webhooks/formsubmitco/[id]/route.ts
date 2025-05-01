import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	console.log(id);

	// 读取 request body
	const bodyText = await request.text();
	console.log("Raw body:", bodyText);

	// 尝试解析为 JSON（如果是 JSON 格式）
	try {
		const bodyJson = JSON.parse(bodyText);
		console.log("Parsed body:", bodyJson);
		return NextResponse.json({ message: "Webhook received", data: bodyJson });
	} catch (error) {
		// 如果不是 JSON 格式，可能是表单数据
		console.log("Body is not JSON, might be form data");
		return NextResponse.json({
			message: "Webhook received",
			rawData: bodyText,
		});
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return NextResponse.json({ message: `Webhook received ${id}` });
}
