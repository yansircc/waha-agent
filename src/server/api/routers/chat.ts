import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { nanoid } from "nanoid";
import { z } from "zod";

// 定义消息类型
type Message = {
	role: "user" | "assistant";
	content: string;
};

// In-memory storage for tasks
interface ChatTask {
	taskId: string;
	status: "processing" | "completed";
	response?: string;
	conversationId: string;
	agentId?: string;
	messages: Message[];
}

const chatTasks = new Map<string, ChatTask>();

export const chatRouter = createTRPCRouter({
	sendMessage: protectedProcedure
		.input(
			z.object({
				messages: z
					.array(
						z.object({
							role: z.enum(["user", "assistant"]),
							content: z.string(),
						}),
					)
					.min(1, "At least one message is required"),
				agentId: z.string().optional(),
				conversationId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { messages, agentId, conversationId } = input;
			const userId = ctx.session.user.id;

			// 通过 zod 验证确保有消息，这里只是为了类型安全
			if (messages.length === 0) {
				throw new Error("At least one message is required");
			}

			// 获取最后一条消息
			const lastMessage = messages[messages.length - 1] as Message;
			if (lastMessage.role !== "user") {
				throw new Error("Last message must be from user");
			}

			// For this simplified version, we'll skip agent validation
			// and focus on the chat flow

			// 创建一个新的任务ID
			const taskId = nanoid();

			// 对话ID，如果没有提供则生成一个
			const dialogConversationId = conversationId || `conv-${nanoid()}`;

			// 存储任务信息
			chatTasks.set(taskId, {
				taskId,
				status: "processing",
				conversationId: dialogConversationId,
				agentId,
				messages,
			});

			// 配置webhook URL
			const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/chat`;

			// 触发聊天生成任务
			// 在实际应用中，这会发送到 Trigger.dev
			// 但在这个简化版本中，我们可以直接模拟一个异步响应
			setTimeout(() => {
				simulateChatResponse(taskId, webhookUrl, {
					messages,
					agentId,
					userId,
					conversationId: dialogConversationId,
				});
			}, 2000);

			// 返回任务ID，前端可以用它查询状态
			return {
				taskId,
				status: "processing",
				conversationId: dialogConversationId,
				lastMessageContent: lastMessage.content,
			};
		}),
});

// 模拟聊天响应的函数
async function simulateChatResponse(
	taskId: string,
	webhookUrl: string,
	payload: {
		messages: Message[];
		agentId?: string;
		userId: string;
		conversationId: string;
	},
) {
	try {
		const { messages, agentId, userId, conversationId } = payload;

		// 模拟AI的响应
		// 查找最后一条用户消息
		let lastUserMessage = "";
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i]?.role === "user") {
				lastUserMessage = messages[i]?.content || "";
				break;
			}
		}

		const aiResponse = `This is a simulated response to: "${lastUserMessage}"`;

		// 准备webhook数据
		const webhookData = {
			success: true,
			response: aiResponse,
			messages: [...messages, { role: "assistant", content: aiResponse }],
			userId,
			agentId,
			conversationId,
			taskId,
		};

		// 调用webhook
		await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(webhookData),
		});

		// 更新任务状态
		const task = chatTasks.get(taskId);
		if (task) {
			task.status = "completed";
			task.response = aiResponse;
			chatTasks.set(taskId, task);
		}
	} catch (error) {
		console.error("Error simulating chat response:", error);
	}
}
