"use client";

import { cn } from "@/lib/utils";

import { useChat } from "ai/react";

import { AutoResizeTextarea } from "@/components/autoresize-textarea";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUpIcon } from "lucide-react";

export function ChatForm({
	className,
	...props
}: React.ComponentProps<"form">) {
	const { messages, input, setInput, append } = useChat({
		api: "/api/chat",
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		void append({ content: input, role: "user" });
		setInput("");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
		}
	};

	const header = (
		<header className="m-auto flex max-w-96 flex-col gap-5 text-center">
			<h1 className="font-semibold text-2xl leading-none tracking-tight">
				Basic AI Chatbot Template
			</h1>
			<p className="text-muted-foreground text-sm">
				This is an AI chatbot app template built with{" "}
				<span className="text-foreground">Next.js</span>, the{" "}
				<span className="text-foreground">Vercel AI SDK</span>, and{" "}
				<span className="text-foreground">Vercel KV</span>.
			</p>
			<p className="text-muted-foreground text-sm">
				Connect an API Key from your provider and send a message to get started.
			</p>
		</header>
	);

	const messageList = (
		<div className="my-4 flex h-fit min-h-full flex-col gap-4">
			{messages.map((message) => (
				<div
					key={message.id}
					data-role={message.role}
					className="max-w-[80%] rounded-xl px-3 py-2 text-sm data-[role=assistant]:self-start data-[role=user]:self-end data-[role=assistant]:bg-gray-100 data-[role=user]:bg-blue-500 data-[role=assistant]:text-black data-[role=user]:text-white"
				>
					{message.content}
				</div>
			))}
		</div>
	);

	return (
		<main
			className={cn(
				"mx-auto flex w-full max-w-[35rem] flex-col items-stretch border-none ring-none",
				className,
			)}
			{...props}
		>
			<div className="flex-1 content-center overflow-y-auto px-6">
				{messages.length ? messageList : header}
			</div>
			<form
				onSubmit={handleSubmit}
				className="relative mx-6 mb-6 flex items-center rounded-[16px] border border-input bg-background px-3 py-1.5 pr-8 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/10 focus-within:ring-offset-0"
			>
				<AutoResizeTextarea
					onKeyDown={handleKeyDown}
					onChange={(v) => setInput(v)}
					value={input}
					placeholder="Enter a message"
					className="flex-1 bg-transparent placeholder:text-muted-foreground focus:outline-none"
				/>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="absolute right-1 bottom-1 size-6 rounded-full"
						>
							<ArrowUpIcon size={16} />
						</Button>
					</TooltipTrigger>
					<TooltipContent sideOffset={12}>Submit</TooltipContent>
				</Tooltip>
			</form>
		</main>
	);
}
