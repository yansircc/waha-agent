import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// Store the SSE clients
type Client = {
	id: string;
	controller: ReadableStreamController<Uint8Array>;
};

const clients = new Map<string, Client>();

// Create a server-sent events endpoint
export async function GET(req: NextRequest) {
	const url = new URL(req.url);
	const agentId = url.searchParams.get("agentId");

	if (!agentId) {
		return new Response("Agent ID is required", { status: 400 });
	}

	// Create a new client ID
	const clientId = nanoid();

	// Set up Server-Sent Events
	const stream = new ReadableStream({
		start(controller) {
			clients.set(clientId, { id: clientId, controller });

			// Send a connection established event
			const data = `data: ${JSON.stringify({ type: "connected", clientId })}\n\n`;
			controller.enqueue(new TextEncoder().encode(data));
		},
		cancel() {
			clients.delete(clientId);
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}

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
		} = data;

		if (!success) {
			console.error(`Chat generation failed for user ${userId}:`, error);
			return NextResponse.json({ success: false, error }, { status: 500 });
		}

		// 验证必要数据是否存在
		if (!response || !messages || !userId) {
			return NextResponse.json(
				{ success: false, error: "Missing required data" },
				{ status: 400 },
			);
		}

		console.log(
			`Chat generation completed for user ${userId} with agent ${agentId || "default"}`,
		);

		// 向所有与该agentId相关的客户端发送消息更新
		if (agentId) {
			// 找到所有相关客户端并发送消息
			for (const [_, client] of clients) {
				try {
					const event = {
						type: "message",
						agentId,
						response,
						timestamp: new Date().toISOString(),
					};

					const message = `data: ${JSON.stringify(event)}\n\n`;
					client.controller.enqueue(new TextEncoder().encode(message));
				} catch (err) {
					console.error("Error sending SSE message:", err);
					// 移除断开连接的客户端
					clients.delete(client.id);
				}
			}
		}

		// 使用 revalidatePath 来刷新相关页面的数据
		revalidatePath("/agents");

		// 如果存在agentId，重新验证特定代理路径
		if (agentId) {
			revalidatePath(`/agents/${agentId}`);
		}

		return NextResponse.json({
			success: true,
			message: "Chat response generated successfully",
			response,
			messages,
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
