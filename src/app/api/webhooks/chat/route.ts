import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// Store the SSE clients
type Client = {
	id: string;
	agentId: string;
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
			clients.set(clientId, { id: clientId, agentId, controller });

			// Send a connection established event
			const data = `data: ${JSON.stringify({ type: "connected", clientId })}\n\n`;
			controller.enqueue(new TextEncoder().encode(data));

			console.log(`[SSE] Client connected: ${clientId} for agent: ${agentId}`);
		},
		cancel() {
			clients.delete(clientId);
			console.log(`[SSE] Client disconnected: ${clientId}`);
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

		console.log("[Webhook] Received chat response:", {
			success,
			userId,
			agentId,
			conversationId,
			messageCount: messages?.length,
			messages,
		});

		if (!success) {
			console.error(
				`[Webhook] Chat generation failed for user ${userId}:`,
				error,
			);
			return NextResponse.json({ success: false, error }, { status: 500 });
		}

		// 验证必要数据是否存在
		if (!response || !messages || !userId) {
			console.error("[Webhook] Missing required data:", {
				response,
				messages,
				userId,
			});
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
			let messagesSent = 0;
			// 找到所有相关客户端并发送消息
			for (const [_, client] of clients) {
				if (client.agentId === agentId) {
					try {
						const event = {
							type: "message",
							agentId,
							response,
							messages,
							userId,
							conversationId,
							timestamp: new Date().toISOString(),
						};

						const message = `data: ${JSON.stringify(event)}\n\n`;
						client.controller.enqueue(new TextEncoder().encode(message));
						messagesSent++;
					} catch (err) {
						console.error("[SSE] Error sending message to client:", {
							clientId: client.id,
							error: err instanceof Error ? err.message : String(err),
						});
						// 移除断开连接的客户端
						clients.delete(client.id);
					}
				}
			}

			console.log(
				`[SSE] Messages sent to ${messagesSent} clients for agent ${agentId}`,
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
		});

		return NextResponse.json({
			success: true,
			message: "Chat response processed successfully",
			response,
			messages,
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
