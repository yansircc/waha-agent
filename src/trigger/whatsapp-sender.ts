import { createInstanceApiClient } from "@/lib/waha-api";
import { logger, wait } from "@trigger.dev/sdk";
import type { MessageSendResult } from "./types";

/**
 * 发送消息标记为已读
 */
export async function markMessageAsSeen(
	session: string,
	chatId: string,
	messageId?: string,
	userWahaApiEndpoint?: string,
): Promise<void> {
	// 根据API定义，直接传递messageId参数，有或没有都可以
	await createInstanceApiClient(userWahaApiEndpoint).chatting.sendSeen({
		session,
		chatId,
		messageId,
		participant: null,
	});

	logger.info("Marked message as seen", {
		chatId,
		messageId,
	});
}

/**
 * 开始打字状态
 */
export async function startTypingIndicator(
	session: string,
	chatId: string,
	userWahaApiEndpoint?: string,
): Promise<void> {
	await createInstanceApiClient(userWahaApiEndpoint).chatting.startTyping({
		session,
		chatId,
	});

	logger.info("Started typing indicator", { chatId });
}

/**
 * 停止打字状态
 */
export async function stopTypingIndicator(
	session: string,
	chatId: string,
	userWahaApiEndpoint?: string,
): Promise<void> {
	await createInstanceApiClient(userWahaApiEndpoint).chatting.stopTyping({
		session,
		chatId,
	});

	logger.info("Stopped typing indicator", { chatId });
}

/**
 * 发送多个消息块，模拟人类打字行为
 */
export async function sendMessageChunks(
	session: string,
	chatId: string,
	chunks: string[],
	delays: number[],
	replyToMessageId?: string,
	userWahaApiEndpoint?: string,
): Promise<MessageSendResult> {
	if (!chunks.length) {
		return {
			success: false,
			error: "No message chunks to send",
		};
	}

	// 用于存储发送的最后一条消息ID
	let lastMessageId: string | undefined;

	// 逐块发送消息，模拟真人打字
	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i] || "";
		const isFirstChunk = i === 0;
		const isLastChunk = i === chunks.length - 1;

		// 为第一块消息添加引用回复
		const replyOptions =
			isFirstChunk && replyToMessageId
				? { reply_to: replyToMessageId }
				: { reply_to: null };

		// 计算打字时间（转换为秒，确保至少1秒）
		const typingDelay = delays[i] || 1000;
		const typingTimeInSeconds = Math.max(1, Math.ceil(typingDelay / 1000));

		// 等待模拟打字时间
		await wait.for({ seconds: typingTimeInSeconds });

		// 发送消息块
		const sendResult = await createInstanceApiClient(
			userWahaApiEndpoint,
		).chatting.sendText({
			session,
			chatId,
			text: chunk,
			linkPreview: isLastChunk, // 只在最后一个块启用链接预览
			...replyOptions,
		});

		// 保存最后发送的消息ID
		lastMessageId = sendResult.id;

		// 如果不是最后一块，需要做额外处理
		if (!isLastChunk) {
			// 短暂的思考时间
			await wait.for({ seconds: 1 });

			// 重新激活打字状态，因为发送消息后打字状态会自动消失
			// 这确保了下一个消息块发送前，用户能看到"正在输入"的状态
			try {
				await createInstanceApiClient(userWahaApiEndpoint).chatting.startTyping(
					{
						session,
						chatId,
					},
				);

				logger.debug("Re-activated typing indicator for next chunk", {
					chunkIndex: i + 1,
					remainingChunks: chunks.length - i - 1,
				});
			} catch (typingError) {
				logger.warn("Failed to re-activate typing indicator", {
					error:
						typingError instanceof Error
							? typingError.message
							: String(typingError),
					chunkIndex: i,
				});
				// 继续流程，即使打字状态设置失败
			}
		}
	}

	logger.info("Sent all message chunks", {
		chatId,
		chunks: chunks.length,
		messageId: lastMessageId,
	});

	return {
		success: true,
		messageId: lastMessageId,
		chatId,
		response: chunks.join(" "),
	};
}

/**
 * 发送错误消息到用户
 */
export async function sendErrorMessage(
	session: string,
	chatId: string,
	message = "Sorry, AFK for a while, I'll be back soon.",
	userWahaApiEndpoint?: string,
): Promise<void> {
	try {
		// 尝试停止输入状态
		try {
			await stopTypingIndicator(session, chatId, userWahaApiEndpoint);
		} catch (_typingError) {
			// 忽略停止输入时的错误
		}

		await createInstanceApiClient(userWahaApiEndpoint).chatting.sendText({
			session,
			chatId,
			text: message,
			linkPreview: false,
		});
	} catch (error) {
		logger.error("Failed to send error message to user", {
			error: error instanceof Error ? error.message : String(error),
			chatId,
		});
	}
}
