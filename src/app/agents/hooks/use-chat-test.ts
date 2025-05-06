"use client";

import type { agentChat } from "@/trigger/agent-chat";
import type { Message } from "@/types/agents";
import type { Agent } from "@/types/agents";
import { api } from "@/utils/api";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useCallback, useEffect, useState } from "react";

interface UseChatTestProps {
	agent: Agent;
	kbIds: string[];
	onOpenChange?: (open: boolean) => void;
}

type RunStatus =
	| "COMPLETED"
	| "FAILED"
	| "EXECUTING"
	| "PENDING_VERSION"
	| "WAITING_FOR_DEPLOY"
	| "QUEUED"
	| "REATTEMPTING"
	| "FROZEN"
	| "CANCELED"
	| "CRASHED"
	| "INTERRUPTED"
	| "SYSTEM_FAILURE"
	| "DELAYED"
	| "EXPIRED"
	| "TIMED_OUT";

interface UseChatTestReturn {
	messages: Message[];
	inputValue: string;
	isThinking: boolean;
	runError: Error | undefined;
	setInputValue: (value: string) => void;
	handleSendMessage: () => void;
	handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	chatMutation: {
		isPending: boolean;
	};
	run:
		| {
				status?: RunStatus;
				output?: {
					success?: boolean;
					response?: string;
					error?: string;
				};
		  }
		| undefined;
}

export function useChatTest({
	agent,
	kbIds,
	onOpenChange,
}: UseChatTestProps): UseChatTestReturn {
	// State management
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [runId, setRunId] = useState<string | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [isThinking, setIsThinking] = useState(false);

	// tRPC mutation
	const chatMutation = api.chat.triggerAgentChat.useMutation({
		onSuccess: (data) => {
			setRunId(data.handle.id);
			setToken(data.token);
			setConversationId(data.conversationId);
			// Keep thinking state active until response is received
			setIsThinking(true);
		},
		onError: (error) => {
			console.error("Chat mutation error:", error);
			// Add error message to chat
			const errorMessage: Message = {
				id: Date.now().toString(),
				role: "assistant",
				content: `Error: ${error.message}`,
			};
			setMessages((prev) => [...prev, errorMessage]);
			setIsThinking(false);
		},
	});

	// Use the realtime run hook
	const { run, error: runError } = useRealtimeRun<typeof agentChat>(
		runId || "",
		{
			accessToken: token || "",
			enabled: !!runId && !!token,
		},
	);

	// Clear chat state
	const clearChat = useCallback(() => {
		setMessages([]);
		setConversationId(null);
		setRunId(null);
		setToken(null);
		setIsThinking(false);
	}, []);

	// Reset chat when dialog is closed
	useEffect(() => {
		if (!onOpenChange) {
			clearChat();
		}
	}, [onOpenChange, clearChat]);

	// Update messages when run data is available
	useEffect(() => {
		if (run?.output?.success && run?.output?.response) {
			// Check if the message is already in the list to prevent duplicates
			const exists = messages.some(
				(m) => m.role === "assistant" && m.content === run.output?.response,
			);

			if (!exists) {
				const assistantMessage: Message = {
					id: Date.now().toString(),
					role: "assistant",
					content: run.output.response,
				};
				setMessages((prev) => [...prev, assistantMessage]);
				setIsThinking(false);
			}
		} else if (run?.output?.error) {
			// Add error message
			const exists = messages.some(
				(m) =>
					m.role === "assistant" && m.content.includes(run.output?.error || ""),
			);

			if (!exists) {
				const errorMessage: Message = {
					id: Date.now().toString(),
					role: "assistant",
					content: `Error: ${run.output.error}`,
				};
				setMessages((prev) => [...prev, errorMessage]);
				setIsThinking(false);
			}
		}

		// If run status is completed but no output, clear thinking state
		if (run?.status === "COMPLETED" || run?.status === "FAILED") {
			setIsThinking(false);
		}
	}, [run, messages]);

	// Handle send message
	const handleSendMessage = useCallback(() => {
		if (!inputValue.trim() || chatMutation.isPending) return;

		// Add user message to chat
		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: inputValue,
		};

		setMessages((prev) => [...prev, userMessage]);
		setIsThinking(true);

		// Prepare all messages for the API call - convert to ApiMessage format
		const apiMessages = [...messages, userMessage].map((msg) => ({
			role: msg.role,
			content: msg.content,
		}));

		// Trigger the chat mutation
		chatMutation.mutate({
			messages: apiMessages,
			agent,
			conversationId: conversationId || "",
			kbIds,
		});

		// Clear input
		setInputValue("");
	}, [inputValue, chatMutation, messages, agent, conversationId, kbIds]);

	// Handle Enter key press
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	return {
		messages,
		inputValue,
		isThinking,
		runError,
		setInputValue,
		handleSendMessage,
		handleKeyDown,
		chatMutation,
		run,
	};
}
