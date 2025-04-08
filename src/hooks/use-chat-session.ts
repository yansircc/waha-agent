import { triggerChatGeneration } from "@/lib/trigger-helpers";
import { api } from "@/utils/api";
import { useState } from "react";

interface Message {
	id?: string;
	content: string;
	role: "user" | "assistant";
	timestamp?: Date;
	sources?: string[];
}

interface UseChatSessionProps {
	agentId?: string;
	kbIds?: string[];
}

export function useChatSession({ agentId, kbIds }: UseChatSessionProps = {}) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const utils = api.useContext();

	// Use tRPC mutation hook
	const sendMessageMutation = api.chat.sendMessage.useMutation({
		onSuccess: (data) => {
			console.log("Message processing task started:", data.taskId);
			// Invalidate queries to refresh data
			void utils.chat.invalidate();
		},
		onError: (err) => {
			console.error("Error sending message:", err);
			setError(err.message || "Failed to send message");
			setIsProcessing(false);
		},
	});

	const sendMessage = async (content: string) => {
		try {
			setError(null);

			// Create user message with unique ID
			const userMessage: Message = {
				id: crypto.randomUUID(),
				content,
				role: "user",
				timestamp: new Date(),
			};

			// Add user message to chat
			setMessages((prev) => [...prev, userMessage]);
			setIsProcessing(true);

			// Prepare messages for API call (convert to format expected by API)
			const apiMessages = [...messages, userMessage].map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

			// Call the TRPC endpoint to trigger cloud processing
			await sendMessageMutation.mutateAsync({
				messages: apiMessages,
				agentId,
			});

			// We don't add assistant message here - it will come from webhook
		} catch (err) {
			console.error("Error in sendMessage:", err);
			// Error is handled in the mutation's onError callback
		}
	};

	// Update messages when webhook response is received
	const updateWithResponse = (responseText: string, sourcesData?: string[]) => {
		const assistantMessage: Message = {
			id: crypto.randomUUID(),
			content: responseText,
			role: "assistant",
			timestamp: new Date(),
			sources: sourcesData,
		};

		setMessages((prev) => [...prev, assistantMessage]);
		setIsProcessing(false);
	};

	const clearChat = () => {
		setMessages([]);
		setError(null);
	};

	return {
		messages,
		isProcessing,
		error,
		sendMessage,
		updateWithResponse,
		clearChat,
	};
}
