import { triggerChatGeneration } from "@/lib/trigger-helpers";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";

// 定义消息类型
type Message = {
	role: "user" | "assistant";
	content: string;
};

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

			// 如果提供了agentId，验证其属于当前用户
			if (agentId) {
				// 从数据库查询agent
				const userAgent = await db.query.agents.findFirst({
					where: (agent, { eq, and }) =>
						and(eq(agent.id, agentId), eq(agent.createdById, userId)),
				});

				if (!userAgent) {
					throw new Error(
						"Agent not found or you don't have permission to use it",
					);
				}
			}

			// 配置webhook URL
			const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/chat`;

			// 使用Trigger.dev触发聊天生成任务
			const { taskId } = await triggerChatGeneration({
				messages,
				agentId,
				userId,
				webhookUrl,
				conversationId,
			});

			// 返回任务ID，前端可以用它查询状态
			return {
				taskId,
				status: "processing",
				lastMessageContent: lastMessage.content,
			};
		}),
});
