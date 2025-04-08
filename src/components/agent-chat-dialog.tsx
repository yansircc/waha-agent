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
import { useAgentQuery } from "@/hooks/use-agent-query";
import { cn } from "@/lib/utils";
import { Bot, Cloud, Send, User } from "lucide-react";
import { useState } from "react";

interface Message {
	id: string;
	content: string;
	role: "user" | "assistant";
	timestamp: Date;
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
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");

	const { isLoading, queryWithAgent, error } = useAgentQuery({
		onSuccess: (data) => {
			// Create the assistant message from the API response
			const assistantMessage: Message = {
				id: crypto.randomUUID(),
				content: data.answer,
				role: "assistant",
				timestamp: new Date(),
				sources: data.sources,
			};

			setMessages((prev) => [...prev, assistantMessage]);
		},
		onError: (error) => {
			console.error("Error querying agent:", error);
			// Add an error message
			const errorMessage: Message = {
				id: crypto.randomUUID(),
				content:
					"Sorry, there was an error processing your request. Please try again.",
				role: "assistant",
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, errorMessage]);
		},
	});

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

		// Query the agent using the useAgentQuery hook
		queryWithAgent(agentId, inputValue, kbIds);
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
