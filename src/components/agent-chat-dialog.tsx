"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Bot, MessagesSquare, Send, User } from "lucide-react";
import { useState } from "react";

interface Message {
	id: string;
	content: string;
	role: "user" | "assistant";
	timestamp: Date;
}

interface AgentChatDialogProps {
	agentId: string;
	agentName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AgentChatDialog({
	agentId,
	agentName,
	open,
	onOpenChange,
}: AgentChatDialogProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSendMessage = async () => {
		if (!inputValue.trim()) return;

		// Create a new user message
		const userMessage: Message = {
			id: crypto.randomUUID(),
			content: inputValue,
			role: "user",
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInputValue("");
		setIsLoading(true);

		// Simulate an API call - this would be replaced with your actual API call
		setTimeout(() => {
			const assistantMessage: Message = {
				id: crypto.randomUUID(),
				content: `This is a simulated response from the agent "${agentName}" (ID: ${agentId}). In a real implementation, you would integrate with your AI provider here.`,
				role: "assistant",
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, assistantMessage]);
			setIsLoading(false);
		}, 1000);
	};

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
						<MessagesSquare className="h-5 w-5" />
						Chat with {agentName}
					</DialogTitle>
				</DialogHeader>

				<div className="flex h-[350px] flex-col gap-4 overflow-y-auto p-4">
					{messages.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center text-center">
							<MessagesSquare className="mb-2 h-12 w-12 text-muted-foreground/50" />
							<p className="font-medium text-lg">No messages yet</p>
							<p className="text-muted-foreground text-sm">
								Send a message to start the conversation
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
					{isLoading && (
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

				<div className="flex items-center gap-2">
					<Input
						placeholder="Type a message..."
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={isLoading}
						className="flex-1"
					/>
					<Button
						onClick={() => void handleSendMessage()}
						disabled={!inputValue.trim() || isLoading}
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
