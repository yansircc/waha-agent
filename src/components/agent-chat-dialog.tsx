"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Bot, Cloud, Send, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// 定义消息类型接口
interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	sources?: string[];
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

	// 清空聊天记录
	const clearChat = useCallback(() => {
		setMessages([]);
		setError(null);
	}, []);

	// 更新助手响应
	const updateWithResponse = useCallback((content: string) => {
		const assistantMessage: ChatMessage = {
			id: Date.now().toString(),
			role: "assistant",
			content,
			// 如果有源信息，可以在这里添加
			sources: [],
		};

		setMessages((prev) => [...prev, assistantMessage]);
	}, []);

	// 发送消息
	const sendMessage = useCallback(
		async (content: string) => {
			try {
				setError(null);
				setIsProcessing(true);

				// 添加用户消息到聊天
				const userMessage: ChatMessage = {
					id: Date.now().toString(),
					role: "user",
					content,
				};

				setMessages((prev) => [...prev, userMessage]);

				// 发送消息到API
				const response = await fetch("/api/chat", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						agentId,
						message: content,
						kbIds,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Failed to send message");
				}

				// API直接响应的情况（非实时）
				const data = await response.json();
				if (data.response) {
					updateWithResponse(data.response);
				}
			} catch (err) {
				console.error("Error sending message:", err);
				setError(err instanceof Error ? err.message : "Failed to send message");
			} finally {
				setIsProcessing(false);
			}
		},
		[agentId, kbIds, updateWithResponse],
	);

	// 对话关闭时清除聊天
	useEffect(() => {
		if (!open) {
			clearChat();
		}
	}, [open, clearChat]);

	// 设置SSE事件源以接收实时消息
	useEffect(() => {
		if (!open) return;

		// 创建SSE连接
		const eventSource = new EventSource(
			`/api/webhooks/chat?agentId=${agentId}`,
		);

		// 处理接收到的消息
		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

				// 只处理与当前代理相关的消息
				if (
					data.type === "message" &&
					data.agentId === agentId &&
					data.response
				) {
					// 更新聊天界面
					updateWithResponse(data.response);
				}
			} catch (err) {
				console.error("Error parsing SSE message:", err);
			}
		};

		// 连接错误处理
		eventSource.onerror = (err) => {
			console.error("SSE connection error:", err);
			eventSource.close();
		};

		// 清理函数
		return () => {
			eventSource.close();
		};
	}, [open, agentId, updateWithResponse]);

	// 发送消息处理函数
	const handleSendMessage = async () => {
		if (!inputValue.trim()) return;
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
								Try asking a question about your knowledge base
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

								{message.sources && message.sources.length > 0 && (
									<div className="mt-2">
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="link"
													size="sm"
													className="h-auto p-0 text-xs"
												>
													Sources: {message.sources.length}
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<div className="max-w-xs">
													<p className="mb-1 font-medium text-xs">Sources:</p>
													<ul className="list-disc pl-4 text-xs">
														{message.sources.map((source, index) => (
															<li
																key={`${message.id}-source-${index}`}
																className="mb-1"
															>
																{source}
															</li>
														))}
													</ul>
												</div>
											</TooltipContent>
										</Tooltip>
									</div>
								)}
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
