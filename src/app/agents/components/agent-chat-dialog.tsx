"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Bot, Cloud, Send, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// 定义消息类型接口
interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	messageId?: string; // 服务器端消息ID
}

interface AgentChatDialogProps {
	agentId: string;
	agentName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	kbIds?: string[];
}

export function AgentChatDialog({
	agentId,
	agentName,
	open,
	onOpenChange,
	kbIds,
}: AgentChatDialogProps) {
	// 内部状态管理
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [inputValue, setInputValue] = useState("");
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

	// 轮询定时器
	const pollingInterval = useRef<NodeJS.Timeout | null>(null);

	// 清空聊天记录
	const clearChat = useCallback(() => {
		setMessages([]);
		setError(null);
		setConversationId(null);
		setCurrentMessageId(null);

		// 确保停止轮询
		if (pollingInterval.current) {
			clearInterval(pollingInterval.current);
			pollingInterval.current = null;
		}
	}, []);

	// 轮询消息更新
	const startPolling = useCallback(() => {
		// 如果没有对话ID或者不在处理中，则不需要轮询
		if (!conversationId || !isProcessing || !currentMessageId) return;

		// 避免创建多个轮询
		if (pollingInterval.current) {
			clearInterval(pollingInterval.current);
			pollingInterval.current = null;
		}

		console.log(
			`Starting polling for conversation ${conversationId}, messageId ${currentMessageId}`,
		);

		const checkStatus = async () => {
			try {
				const response = await fetch(
					`/api/chat/status?conversationId=${conversationId}&messageId=${currentMessageId}`,
				);

				if (!response.ok) return;

				const data = await response.json();

				// 如果响应已完成
				if (data.status === "completed") {
					// 有错误信息
					if (data.error) {
						setError(data.error);
						setIsProcessing(false);
						setCurrentMessageId(null);

						// 停止轮询
						if (pollingInterval.current) {
							clearInterval(pollingInterval.current);
							pollingInterval.current = null;
						}
						return;
					}

					// 有响应消息
					if (data.response) {
						console.log(
							`Received response for messageId ${currentMessageId}:`,
							`${data.response.substring(0, 50)}...`,
						);

						// 添加助手响应
						const assistantMessage: ChatMessage = {
							id: Date.now().toString(),
							role: "assistant",
							content: data.response,
							messageId: data.messageId,
						};

						setMessages((prev) => [...prev, assistantMessage]);
						setIsProcessing(false);
						setCurrentMessageId(null);

						// 停止轮询
						if (pollingInterval.current) {
							clearInterval(pollingInterval.current);
							pollingInterval.current = null;
						}
					}
				}
			} catch (error) {
				console.error("Error polling for updates:", error);
			}
		};

		// 立即执行一次
		void checkStatus();

		// 设置轮询 - 每3秒检查一次
		pollingInterval.current = setInterval(checkStatus, 3000);

		// 清理函数
		return () => {
			if (pollingInterval.current) {
				clearInterval(pollingInterval.current);
				pollingInterval.current = null;
			}
		};
	}, [conversationId, isProcessing, currentMessageId]);

	// 发送消息
	const sendMessage = useCallback(
		async (content: string) => {
			try {
				setError(null);
				setIsProcessing(true);

				// 创建对话ID（如果不存在）
				const dialogConversationId = conversationId || `conv-${Date.now()}`;
				if (!conversationId) {
					setConversationId(dialogConversationId);
				}

				// 首先，在API中注册这个新的用户消息
				const registerResponse = await fetch("/api/chat/register", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						conversationId: dialogConversationId,
						message: content,
					}),
				});

				if (!registerResponse.ok) {
					throw new Error("Failed to register message");
				}

				const { messageId } = await registerResponse.json();
				console.log(`User message registered with ID: ${messageId}`);

				// 设置当前消息ID用于轮询
				setCurrentMessageId(messageId);

				// 添加用户消息到聊天
				const userMessage: ChatMessage = {
					id: Date.now().toString(),
					role: "user",
					content,
					messageId,
				};

				setMessages((prev) => [...prev, userMessage]);

				// 准备发送到API的消息格式 - 包含所有对话历史
				const apiMessages = messages.concat(userMessage).map((msg) => ({
					role: msg.role,
					content: msg.content,
				}));

				// 发送消息到触发器API
				const response = await fetch("/api/trigger/chat", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						messages: apiMessages,
						agentId,
						kbId: kbIds,
						conversationId: dialogConversationId,
						webhookUrl: `${window.location.origin}/api/webhooks/chat`,
						messageId, // 发送消息ID到触发器
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Failed to send message");
				}

				// 响应成功，开始轮询
				startPolling();
			} catch (err) {
				console.error("Error sending message:", err);
				setError(err instanceof Error ? err.message : "Failed to send message");
				setIsProcessing(false);
				setCurrentMessageId(null);
			}
		},
		[agentId, conversationId, messages, startPolling, kbIds],
	);

	// 对话关闭时清除聊天
	useEffect(() => {
		if (!open) {
			clearChat();
		}
	}, [open, clearChat]);

	// 当isProcessing状态改变时，管理轮询
	useEffect(() => {
		if (isProcessing && conversationId && currentMessageId) {
			startPolling();
		}

		// 清理函数
		return () => {
			if (pollingInterval.current) {
				clearInterval(pollingInterval.current);
				pollingInterval.current = null;
			}
		};
	}, [isProcessing, conversationId, currentMessageId, startPolling]);

	// 发送消息处理函数
	const handleSendMessage = async () => {
		if (!inputValue.trim() || isProcessing) return;
		await sendMessage(inputValue);
		setInputValue("");
	};

	// 按Enter发送消息
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void handleSendMessage();
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Cloud className="h-5 w-5" />
						Chat with {agentName}
					</DialogTitle>
				</DialogHeader>

				<div className="flex h-[350px] flex-col gap-4 overflow-y-auto p-4">
					{messages.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center text-center">
							<Cloud className="mb-2 h-12 w-12 text-muted-foreground/50" />
							<p className="font-medium text-lg">Ask me anything</p>
							<p className="text-muted-foreground text-sm">
								Try asking a question about this agent
							</p>
						</div>
					) : (
						messages.map((message) => (
							<div
								key={message.id}
								className={cn(
									"flex w-max max-w-[80%] flex-col gap-2 rounded-lg p-4",
									message.role === "user"
										? "ml-auto bg-primary text-primary-foreground"
										: "bg-muted",
								)}
							>
								<div className="flex items-center gap-2">
									{message.role === "user" ? (
										<User className="h-4 w-4" />
									) : (
										<Bot className="h-4 w-4" />
									)}
									<span className="font-medium text-xs">
										{message.role === "user" ? "You" : agentName}
									</span>
								</div>
								<p className="text-sm">{message.content}</p>
							</div>
						))
					)}
					{isProcessing && (
						<div className="flex w-max max-w-[80%] flex-col gap-2 rounded-lg bg-muted p-4">
							<div className="flex items-center gap-2">
								<Bot className="h-4 w-4" />
								<span className="font-medium text-xs">{agentName}</span>
							</div>
							<div className="flex gap-1">
								<span className="animate-bounce">.</span>
								<span className="animate-bounce delay-100">.</span>
								<span className="animate-bounce delay-200">.</span>
							</div>
						</div>
					)}
				</div>

				{error && (
					<div className="mb-4 rounded-md bg-destructive/15 p-3 text-destructive text-sm">
						{error}
					</div>
				)}

				<div className="flex items-center gap-2">
					<Input
						placeholder="Ask a question..."
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={isProcessing}
						className="flex-1"
					/>
					<Button
						onClick={() => void handleSendMessage()}
						disabled={!inputValue.trim() || isProcessing}
						size="icon"
					>
						<Send className="h-4 w-4" />
						<span className="sr-only">Send message</span>
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
