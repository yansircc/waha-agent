import { storeResponse } from "@/lib/chat-store";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ChatWebhookDataSchema = z.object({
	success: z.boolean(),
	response: z.string().optional(),
	messages: z
		.array(
			z.object({
				role: z.string(),
				content: z.string(),
			}),
		)
		.optional(),
	error: z.string().optional(),
	agent: z.object({
		id: z.string(),
		name: z.string(),
		prompt: z.string(),
		model: z.string(),
	}),
	conversationId: z.string(),
	messageId: z.string(),
});

/**
 * 聊天生成 Webhook 端点
 *
 * 接收来自 Trigger.dev 的聊天生成结果通知
 */
export async function POST(req: NextRequest) {
	try {
		const data = await req.json();
		const parsedData = ChatWebhookDataSchema.parse(data);

		const {
			success,
			response,
			messages,
			error,
			agent,
			conversationId,
			messageId,
		} = parsedData;

		console.log("[Webhook] 收到聊天响应:", {
			success,
			agent,
			conversationId,
			messageId,
			messageCount: messages?.length,
		});

		if (!success) {
			// 存储错误信息，包含消息ID
			if (conversationId && messageId) {
				await storeResponse(conversationId, "", error, messageId);
				console.log(
					`[Webhook] 存储错误响应用于对话: ${conversationId}, 消息ID: ${messageId}`,
				);
			}

			// 即使出错，也返回200状态码，让前端通过轮询获取错误信息
			return NextResponse.json(
				{
					success: false,
					error,
					conversationId,
					messageId,
				},
				{ status: 200 },
			);
		}

		// 验证必要数据是否存在
		if (!response || !messages) {
			const missingDataError = "缺少必要数据";
			console.error("[Webhook] 缺少必要数据:", {
				response,
				messages,
			});

			// 存储错误信息，包含消息ID
			if (conversationId && messageId) {
				await storeResponse(conversationId, "", missingDataError, messageId);
			}

			return NextResponse.json(
				{ success: false, error: missingDataError },
				{ status: 400 },
			);
		}

		// 存储响应以供轮询获取，并包含消息ID
		if (conversationId) {
			await storeResponse(conversationId, response, undefined, messageId);
			console.log(
				`[Webhook] 存储响应用于对话ID: ${conversationId}, 消息ID: ${messageId || "未提供"}`,
			);
		}

		// 使用 revalidatePath 来刷新相关页面的数据
		revalidatePath("/agents");

		// 如果存在agentId，重新验证特定机器人路径
		if (agent.id) {
			revalidatePath(`/agents/${agent.id}`);
		}

		console.log("[Webhook] 成功处理聊天响应", {
			agent,
			conversationId,
			messageId,
		});

		return NextResponse.json({
			success: true,
			message: "聊天响应处理成功",
		});
	} catch (error) {
		console.error("[Webhook] 处理请求时出错:", {
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
