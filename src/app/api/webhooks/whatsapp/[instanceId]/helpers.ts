import {
	addMessageToChatHistory,
	chatHistoryExists,
	initializeChatHistory,
} from "@/lib/chat-history-redis";
import { getBotPhoneNumber, saveBotPhoneNumber } from "@/lib/instance-redis";
import { createInstanceApiClient } from "@/lib/waha-api";
import { db } from "@/server/db";
import { instances } from "@/server/db/schema";
import type { ChatMessage } from "@/trigger/types";
import type { WAMessage } from "@/types/waha";
import { eq } from "drizzle-orm";
import { catchError } from "react-catch-error";

/**
 * 识别和保存机器人电话号码
 */
export async function identifyAndSaveBotPhoneNumber(
	instanceId: string,
	messageData: Partial<WAMessage>,
	session: string,
): Promise<string | null> {
	// 先尝试获取已存储的机器人号码
	const { error: getError, data: botPhoneNumber } = await catchError(async () =>
		getBotPhoneNumber(instanceId),
	);

	if (getError) {
		console.error("获取机器人电话号码失败:", getError);
	}

	// 如果已有号码，直接返回
	if (botPhoneNumber) {
		return botPhoneNumber;
	}

	// 从消息中确定号码的策略
	let detectedNumber: string | null = null;

	// 如果是机器人发送的消息，机器人号码是 from
	if (messageData.fromMe === true && messageData.from) {
		detectedNumber = messageData.from;
	}
	// 如果是用户发送的消息，机器人号码是 to
	else if (messageData.fromMe === false && messageData.to) {
		detectedNumber = messageData.to;
	}

	// 如果从消息中确定了号码，保存并返回
	if (detectedNumber) {
		const { error: saveError } = await catchError(async () =>
			saveBotPhoneNumber(instanceId, detectedNumber),
		);

		if (saveError) {
			console.error("保存机器人电话号码失败:", saveError);
		} else {
			console.log(`从消息中确定并保存机器人电话号码: ${detectedNumber}`);
		}

		return detectedNumber;
	}

	const { data: userWahaApiEndpoint, error: userWahaApiEndpointError } =
		await catchError(async () => getUserWahaApiEndpoint(instanceId));

	if (userWahaApiEndpointError) {
		console.error("获取WhatsApp账号失败:", userWahaApiEndpointError);
		return null;
	}

	const wahaApi = createInstanceApiClient(userWahaApiEndpoint);

	// 尝试从API获取机器人信息
	const { error: apiError, data: meInfo } = await catchError(async () =>
		wahaApi.sessions.getMeInfo(session),
	);

	if (apiError) {
		console.error("获取机器人信息失败:", apiError);
		return null;
	}

	if (meInfo?.phoneNumber) {
		const phoneNumber = meInfo.phoneNumber;

		// 保存API返回的电话号码
		const { error: saveError } = await catchError(async () =>
			saveBotPhoneNumber(instanceId, phoneNumber),
		);

		if (saveError) {
			console.error("保存机器人电话号码失败:", saveError);
		} else {
			console.log(`从API获取并保存机器人电话号码: ${phoneNumber}`);
		}

		return phoneNumber;
	}

	return null;
}

/**
 * 将消息添加到聊天历史记录中
 */
export async function handleChatHistory(
	instanceId: string,
	session: string,
	messageData: Partial<WAMessage>,
	otherPartyId: string,
	userWahaApiEndpoint?: string,
): Promise<void> {
	if (!messageData.id || !messageData.timestamp || !otherPartyId) {
		console.log("消息缺少必要信息，无法添加到聊天历史");
		return;
	}

	// 以对方ID为键存储聊天记录
	const historyKey = otherPartyId;

	// 首先检查这个聊天的历史是否已经存在于Redis中
	const { error: existsError, data: historyExists } = await catchError(
		async () => chatHistoryExists(instanceId, historyKey),
	);

	if (existsError) {
		console.error("检查聊天历史记录存在性失败:", existsError);
		return;
	}

	// 如果历史记录不存在，尝试从WhatsApp API初始化
	if (!historyExists) {
		console.log(`没有找到聊天 ${historyKey} 的历史记录，正在从API初始化...`);

		const { error: initError } = await catchError(async () =>
			initializeChatHistory(
				instanceId,
				session,
				historyKey,
				userWahaApiEndpoint,
			),
		);

		if (initError) {
			console.error("初始化聊天历史记录失败:", initError);
			// 失败后仍继续添加当前消息，确保至少记录新消息
		}
	}

	// 添加当前消息到历史记录
	const { error: addError } = await catchError(async () =>
		addMessageToChatHistory(instanceId, historyKey, messageData as WAMessage),
	);

	if (addError) {
		console.error("添加消息到聊天历史记录失败:", addError);
	}
}

/**
 * 确定与用户对话的另一方ID
 */
export function determineOtherPartyId(
	messageData: Partial<WAMessage>,
): string | undefined {
	// 如果消息是自己发的 (fromMe=true)，则另一方是接收者 (to)
	// 如果消息是别人发的 (fromMe=false)，则另一方是发送者 (from)
	return messageData.fromMe ? messageData.to : messageData.from;
}

/**
 * 获取用户实例的 WhatsApp API 端点
 */
export async function getUserWahaApiEndpoint(
	instanceId: string,
): Promise<string | undefined> {
	const { data: instance, error: instanceError } = await catchError(async () =>
		db.query.instances.findFirst({
			where: eq(instances.id, instanceId),
		}),
	);

	if (instanceError || !instance) {
		console.error("获取WhatsApp账号失败:", instanceError);
		throw new Error("获取WhatsApp账号失败");
	}

	return instance.userWahaApiEndpoint ?? undefined;
}

/**
 * 将WAMessage转换为ChatMessage格式
 */
export function convertToFormatMessages(messages: WAMessage[]): ChatMessage[] {
	try {
		if (!messages.length) {
			return [];
		}

		// 将消息转换为AI格式
		// 消息按时间从新到旧排序，但我们需要从旧到新，所以反转
		const sortedMessages = [...messages].reverse();

		// 对消息进行去重处理
		const uniqueMessages: WAMessage[] = [];
		const messageIds = new Set<string>();
		const contentMap = new Map<string, Set<string>>();

		// 按时间顺序处理，防止丢失最新的消息状态
		for (const msg of sortedMessages) {
			// 使用消息ID进行去重
			if (msg.id && messageIds.has(msg.id)) {
				continue;
			}

			// 对于没有ID或ID不可靠的情况，使用内容+角色进行去重
			const roleKey = msg.fromMe ? "assistant" : "user";
			const contentKey = `${roleKey}:${msg.body || ""}`;

			if (contentMap.has(contentKey)) {
				// 如果内容已存在，检查时间戳以保留较新的消息
				const existingTimestamps = contentMap.get(contentKey);

				// 对于机器人自己发送的消息(fromMe=true)使用更大的时间窗口(30秒)
				// 对于用户消息使用较小的窗口(5秒)
				const timeWindow = msg.fromMe ? 30000 : 5000;

				// 检查时间窗口内是否有相同消息
				const isTimeClose = Array.from(existingTimestamps || []).some(
					(ts) => Math.abs(Number.parseInt(ts) - msg.timestamp) < timeWindow,
				);

				if (isTimeClose) {
					continue;
				}
			} else {
				contentMap.set(contentKey, new Set());
			}

			// 添加消息ID和时间戳
			if (msg.id) {
				messageIds.add(msg.id);
			}
			contentMap.get(contentKey)?.add(msg.timestamp.toString());

			uniqueMessages.push(msg);
		}

		console.log(
			`转换消息: 原始=${messages.length}, 去重后=${uniqueMessages.length}, 自己发送=${sortedMessages.filter((m) => m.fromMe).length}, 接收=${sortedMessages.filter((m) => !m.fromMe).length}`,
		);

		// 转换为AI可用的消息格式
		return uniqueMessages.map((msg) => {
			// fromMe=true 表示是助手发送的消息
			// fromMe=false 表示是用户发送的消息
			return {
				role: msg.fromMe ? "assistant" : "user",
				content: msg.body || "",
			};
		});
	} catch (error) {
		console.error("转换聊天历史记录格式失败:", error);
		return []; // 出错时返回空数组
	}
}
