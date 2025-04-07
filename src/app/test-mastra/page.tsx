"use client";

import { Button } from "@/components/ui/button";
import type { CoreMessage } from "@mastra/core";
import React from "react";
import { generateMessage } from "./action";

// System prompt as a constant
const SYSTEM_PROMPT =
	"你是一个司机，你的任务是开车，我是你的乘客，你会询问我是否需要去哪里，如果我说去哪里，你会带我去那里。";

export default function TestMastraPage() {
	const [messages, setMessages] = React.useState<CoreMessage[]>([
		{
			role: "assistant",
			content: "你好！",
		},
	]);
	const [isLoading, setIsLoading] = React.useState(false);

	const handleSubmit = async (formData: FormData) => {
		try {
			setIsLoading(true);
			const userInput = formData.get("userInput");

			if (typeof userInput !== "string" || !userInput.trim()) {
				setIsLoading(false);
				return;
			}

			const newMessage: CoreMessage = {
				role: "user",
				content: userInput,
			};

			const updatedMessages = [...messages, newMessage];
			setMessages(updatedMessages);

			// Generate AI response
			const response = await generateMessage(updatedMessages, SYSTEM_PROMPT);

			if (response && "text" in response) {
				setMessages([
					...updatedMessages,
					{ role: "assistant", content: response.text },
				]);
			}
		} catch (error) {
			console.error("Error generating response:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="container mx-auto max-w-3xl p-4">
			<h1 className="mb-4 font-bold text-2xl">AI Assistant Demo</h1>

			<div className="mb-6">
				<form action={handleSubmit} className="mb-4">
					<div className="mb-4 flex gap-2">
						<input
							name="userInput"
							type="text"
							placeholder="Type your message..."
							className="flex-1 rounded border p-2"
							required
							disabled={isLoading}
						/>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Sending..." : "Send"}
						</Button>
					</div>
				</form>
			</div>

			<div className="space-y-4 rounded border p-4">
				{messages.map((message, index) => (
					<div
						key={`message-${message.role}-${index}-${typeof message.content === "string" ? message.content.substring(0, 10).replace(/\W/g, "") : "content"}`}
						className={`rounded p-3 ${
							message.role === "assistant" ? "bg-gray-100" : "bg-blue-50"
						}`}
					>
						<p className="mb-1 font-semibold">
							{message.role === "assistant" ? "Assistant" : "You"}
						</p>
						<div>{message.content as string}</div>
					</div>
				))}

				{isLoading && (
					<div className="rounded bg-gray-100 p-3">
						<p className="mb-1 font-semibold">Assistant</p>
						<div className="flex items-center gap-2">
							<span>Thinking</span>
							<span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gray-500" />
							<span
								className="inline-block h-2 w-2 animate-pulse rounded-full bg-gray-500"
								style={{ animationDelay: "0.2s" }}
							/>
							<span
								className="inline-block h-2 w-2 animate-pulse rounded-full bg-gray-500"
								style={{ animationDelay: "0.4s" }}
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
