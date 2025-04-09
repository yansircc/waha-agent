import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { storeResponse } from "../../chat/status/route";

/**
 * 聊天生成 Webhook 端点
 *
 * 接收来自 Trigger.dev 的聊天生成结果通知
 */
export async function POST(req: NextRequest) {
	try {
		const data = await req.json();
		const {
			success,
			response,
			messages,
			error,
			userId,
			agentId,
			conversationId,
			messageId,
		} = data;

		console.log("[Webhook] Received chat response:", {
			success,
			userId,
			agentId,
			conversationId,
			messageId,
			messageCount: messages?.length,
		});

		if (!success) {
			console.error(
				`[Webhook] Chat generation failed for user ${userId}:`,
				error,
			);

			// 存储错误信息，包含消息ID
			if (conversationId) {
				storeResponse(conversationId, "", error, messageId);
			}

			return NextResponse.json({ success: false, error }, { status: 500 });
		}

		// 验证必要数据是否存在
		if (!response || !messages || !userId) {
			const missingDataError = "Missing required data";
			console.error("[Webhook] Missing required data:", {
				response,
				messages,
				userId,
			});

			// 存储错误信息，包含消息ID
			if (conversationId) {
				storeResponse(conversationId, "", missingDataError, messageId);
			}

			return NextResponse.json(
				{ success: false, error: missingDataError },
				{ status: 400 },
			);
		}

		console.log(
			`[Webhook] Chat generation completed for user ${userId} with agent ${agentId || "default"}`,
		);

		// 存储响应以供轮询获取，并包含消息ID
		if (conversationId) {
			storeResponse(conversationId, response, undefined, messageId);
			console.log(
				`[Webhook] Stored response for conversationId: ${conversationId}, messageId: ${messageId || "not provided"}`,
			);
		}

		// 使用 revalidatePath 来刷新相关页面的数据
		revalidatePath("/agents");

		// 如果存在agentId，重新验证特定代理路径
		if (agentId) {
			revalidatePath(`/agents/${agentId}`);
		}

		console.log("[Webhook] Successfully processed chat response", {
			userId,
			agentId,
			conversationId,
			messageId,
		});

		return NextResponse.json({
			success: true,
			message: "Chat response processed successfully",
		});
	} catch (error) {
		console.error("[Webhook] Error processing request:", {
			error: error instanceof Error ? error.message : String(error),
		});
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
