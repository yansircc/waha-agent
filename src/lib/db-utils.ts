import { db } from "@/server/db";
import { agents, instances } from "@/server/db/schema";
import type { Agent } from "@/types/agents";
import { eq } from "drizzle-orm";

/**
 * 从数据库获取实例关联的代理
 * 这个函数分离出来是为了避免循环依赖
 */
export async function getInstanceAgentFromDb(
	instanceId: string,
): Promise<Agent | null> {
	try {
		// 从数据库获取实例
		const instance = await db.query.instances.findFirst({
			where: eq(instances.id, instanceId),
		});

		if (!instance?.agentId) {
			return null;
		}

		// 获取关联的代理
		const agent = await db.query.agents.findFirst({
			where: eq(agents.id, instance.agentId),
		});

		return agent || null;
	} catch (error) {
		console.error(`从数据库获取实例 ${instanceId} 的代理失败:`, error);
		return null;
	}
}
