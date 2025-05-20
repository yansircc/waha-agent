import { type NextRequest, NextResponse } from "next/server";
import { catchError, catchErrorSync } from "react-catch-error";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	// 获取路由参数
	const { error: paramsError, data: paramsData } = await catchError(
		async () => {
			const { id } = await params;
			return { id };
		},
	);

	if (paramsError || !paramsData) {
		console.error("Error getting route parameters:", paramsError);
		return NextResponse.json(
			{ error: "Invalid request parameters" },
			{ status: 400 },
		);
	}

	const { id } = paramsData;
	console.log("Form webhook received for ID:", id);

	// 读取 request body
	const { error: bodyError, data: bodyText } = await catchError(async () => {
		const bodyText = await request.text();
		return bodyText;
	});

	if (bodyError) {
		console.error("Error reading request body:", bodyError);
		return NextResponse.json(
			{ error: "Failed to read request body" },
			{ status: 400 },
		);
	}

	console.log("Raw body:", bodyText);

	// 尝试解析为 JSON（如果是 JSON 格式）
	const { error: parseError, data: bodyJson } = catchErrorSync(() =>
		JSON.parse(bodyText || ""),
	);

	if (parseError) {
		// 如果不是 JSON 格式，可能是表单数据
		console.log("Body is not JSON, might be form data");
		return NextResponse.json({
			message: "Webhook received",
			id,
			rawData: bodyText,
		});
	}

	// 成功解析为 JSON
	console.log("Parsed body:", bodyJson);
	return NextResponse.json({
		message: "Webhook received",
		id,
		data: bodyJson,
	});
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { error: paramsError, data: paramsData } = await catchError(
		async () => {
			const { id } = await params;
			return { id };
		},
	);

	if (paramsError || !paramsData) {
		console.error("Error getting route parameters:", paramsError);
		return NextResponse.json(
			{ error: "Invalid request parameters" },
			{ status: 400 },
		);
	}

	const { id } = paramsData;
	return NextResponse.json({ message: `Webhook received ${id}` });
}
