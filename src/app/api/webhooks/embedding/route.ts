import { type NextRequest, NextResponse } from "next/server";

/**
 * 文档处理 Webhook 端点
 *
 * 接收来自 Trigger.dev 的文档处理结果通知（现在嵌入已由 Trigger.dev 直接存储在数据库中）
 */
export async function POST(req: NextRequest) {
	try {
		const data = await req.json();
		const { success, documentId, knowledgeBaseId, message, error } = data;

		if (!success) {
			console.error(
				`Document processing failed for document ${documentId}:`,
				error,
			);
			return NextResponse.json({ success: false, error }, { status: 500 });
		}

		// 验证必要数据是否存在
		if (!documentId || !knowledgeBaseId) {
			return NextResponse.json(
				{ success: false, error: "Missing required data" },
				{ status: 400 },
			);
		}

		console.log(`Document processing completed: ${message}`);

		return NextResponse.json({
			success: true,
			message: message || `Processing completed for document ${documentId}`,
		});
	} catch (error) {
		console.error("Error processing webhook:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
