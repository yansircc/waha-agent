import { mastra } from "@/mastra";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";

export const chatRouter = createTRPCRouter({
	sendMessage: protectedProcedure
		.input(
			z.object({
				messages: z.array(
					z.object({
						role: z.enum(["user", "assistant"]),
						content: z.string(),
					}),
				),
				agentId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { messages, agentId } = input;

			// 默认使用研究型agent
			const mastraAgentId = "researchAgent";

			// 如果提供了agentId，验证并获取agent信息
			if (agentId) {
				// 从数据库查询agent
				const userAgent = await db.query.agents.findFirst({
					where: (agent, { eq, and }) =>
						and(
							eq(agent.id, agentId),
							eq(agent.createdById, ctx.session.user.id),
						),
				});

				if (!userAgent) {
					throw new Error(
						"Agent not found or you don't have permission to use it",
					);
				}
			}

			// 获取最后一条消息作为查询内容
			const lastMessage = messages[messages.length - 1];

			if (!lastMessage || !lastMessage.content) {
				throw new Error("Invalid request: message content is required");
			}

			// 直接使用mastra库生成回复
			const mastraAgent = mastra.getAgent(mastraAgentId);
			const response = await mastraAgent.generate(lastMessage.content);

			return {
				response: response.text,
				messages: [...messages, { role: "assistant", content: response.text }],
			};
		}),
});
