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
import type { Agent, Message } from "@/types/agents";
import { Bot, Cloud, Loader2, Send, User } from "lucide-react";
import { useRef } from "react";
import { useChatTest } from "../hooks/use-chat-test";

interface AgentChatDialogRealtimeProps {
	agent: Agent;
	agentName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	kbIds: string[];
}

export function AgentChatDialogRealtime({
	agent,
	agentName,
	open,
	onOpenChange,
	kbIds,
}: AgentChatDialogRealtimeProps) {
	// Ref for auto-scrolling
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const {
		messages,
		inputValue,
		isThinking,
		runError,
		setInputValue,
		handleSendMessage,
		handleKeyDown,
		chatMutation,
		run,
	} = useChatTest({
		agent,
		kbIds,
		onOpenChange,
	});

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
								Try asking questions about this agent
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
					<div ref={messagesEndRef} />

					{/* Loading indicator when waiting for response */}
					{isThinking && (
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

				{runError && (
					<div className="mb-4 rounded-md bg-destructive/15 p-3 text-destructive text-sm">
						{runError.message}
					</div>
				)}

				<div className="flex items-center gap-2">
					<Input
						placeholder="Ask anything..."
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={chatMutation.isPending || run?.status === "EXECUTING"}
						className="flex-1"
					/>
					{isThinking ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Button
							onClick={handleSendMessage}
							disabled={
								!inputValue.trim() ||
								chatMutation.isPending ||
								run?.status === "EXECUTING"
							}
							size="icon"
						>
							<Send className="h-4 w-4" />
							<span className="sr-only">Send message</span>
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
