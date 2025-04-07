"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
	type HumanTypingOptions,
	simulateHumanTyping,
} from "@/lib/human-typing-simulator";
import { useEffect, useRef, useState } from "react";

// Define default options to use consistently
const DEFAULT_OPTIONS: Required<HumanTypingOptions> = {
	maxChunkLength: 120,
	minTypingDelay: 300,
	maxAdditionalDelay: 800,
	typoRate: 0.05,
	abbreviationRate: 0.2,
};

// Sample text examples
const SAMPLE_TEXTS = [
	{
		id: "greeting",
		title: "Simple Greeting",
		text: "Hello, I'm a AI assistant, how are you today?",
	},
	{
		id: "paragraph",
		title: "Long Paragraph",
		text: "I is a branch of computer science that attempts to understand the essence of intelligence and produce a new intelligent machine that can react in a similar way to human intelligence. AI is a new technology science that studies, develops, and applies theories, methods, technologies, and application systems for simulating, extending, and expanding human intelligence.",
	},
	{
		id: "list",
		title: "List Text",
		text: "I like the following fruits:\n1. Apple\n2. Banana\n3. Orange\n4. Grape\n5. Watermelon\nI hope you like them too!",
	},
	{
		id: "question",
		title: "Technical Question",
		text: "How to use the useState hook in React? I tried but I got some errors. Can you help me?",
	},
];

interface SimulationResult {
	chunks: string[];
	delays: number[];
}

interface Message {
	id: string;
	text: string;
	timestamp: Date;
	isUser: boolean;
}

export default function TypingTestPage() {
	const [customText, setCustomText] = useState("");
	const [result, setResult] = useState<SimulationResult | null>(null);
	const [messages, setMessages] = useState<Message[]>([
		{
			id: "welcome",
			text: "Welcome to WhatsApp Chat Simulator. Choose a preset text or type your own message to test.",
			timestamp: new Date(),
			isUser: false,
		},
	]);
	const [isTyping, setIsTyping] = useState(false);
	const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
	const chatContainerRef = useRef<HTMLDivElement>(null);
	const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

	// Typing simulation options with default values
	const [options, setOptions] =
		useState<Required<HumanTypingOptions>>(DEFAULT_OPTIONS);

	// Scroll to bottom when messages change
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (chatContainerRef.current) {
			chatContainerRef.current.scrollTop =
				chatContainerRef.current.scrollHeight;
		}
	}, [messages]);

	// Clear all timeouts on unmount
	useEffect(() => {
		return () => {
			timeoutsRef.current.forEach(clearTimeout);
			timeoutsRef.current = [];
		};
	}, []);

	const handleTestClick = (text: string) => {
		// Clear previous timeouts
		timeoutsRef.current.forEach(clearTimeout);
		timeoutsRef.current = [];

		// Add user message
		const userMessage: Message = {
			id: `user-${Date.now()}`,
			text,
			timestamp: new Date(),
			isUser: true,
		};
		setMessages((prev) => [...prev, userMessage]);

		// Process text with the simulator
		const simulationResult = simulateHumanTyping(text, options);
		setResult(simulationResult);
		setCurrentChunkIndex(0);
		setIsTyping(true);

		// Start typing simulation effect with sequential message sending
		let totalDelay = 0;

		simulationResult.chunks.forEach((chunk, index) => {
			const delay = simulationResult.delays[index] || 0;
			totalDelay += delay;

			const timeout = setTimeout(() => {
				setCurrentChunkIndex(index + 1);

				const botMessage: Message = {
					id: `bot-${Date.now()}-${index}`,
					text: chunk,
					timestamp: new Date(),
					isUser: false,
				};

				setMessages((prev) => [...prev, botMessage]);

				// After the last chunk is complete
				if (index === simulationResult.chunks.length - 1) {
					setTimeout(() => {
						setIsTyping(false);
					}, 500);
				}
			}, totalDelay);

			timeoutsRef.current.push(timeout);
		});
	};

	// Format timestamp
	const formatTime = (date: Date) => {
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	};

	return (
		<div className="container mx-auto py-8">
			<h1 className="mb-6 font-bold text-3xl">WhatsApp Style Chat Simulator</h1>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<div className="space-y-4">
					{SAMPLE_TEXTS.map((sample) => (
						<Card key={sample.id}>
							<CardHeader>
								<CardTitle>{sample.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="mb-4 whitespace-pre-line">{sample.text}</p>
								<Button onClick={() => handleTestClick(sample.text)}>
									Test This Text
								</Button>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Option settings */}
				{/* <Card className="mt-6">
						<CardHeader>
							<CardTitle>Simulation Options</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-2">
								<div className="flex justify-between">
									<Label>Max Chunk Length: {options.maxChunkLength}</Label>
									<span className="text-muted-foreground text-sm">
										{options.maxChunkLength} characters
									</span>
								</div>
								<Slider
									value={[options.maxChunkLength]}
									min={20}
									max={300}
									step={10}
									onValueChange={(values: number[]) => {
										if (values[0] !== undefined) {
											setOptions({ ...options, maxChunkLength: values[0] });
										}
									}}
								/>
							</div>

							<div className="space-y-2">
								<div className="flex justify-between">
									<Label>Min Delay: {options.minTypingDelay}</Label>
									<span className="text-muted-foreground text-sm">
										{options.minTypingDelay} ms
									</span>
								</div>
								<Slider
									value={[options.minTypingDelay]}
									min={100}
									max={2000}
									step={100}
									onValueChange={(values: number[]) => {
										if (values[0] !== undefined) {
											setOptions({ ...options, minTypingDelay: values[0] });
										}
									}}
								/>
							</div>

							<div className="space-y-2">
								<div className="flex justify-between">
									<Label>
										Max Additional Delay: {options.maxAdditionalDelay}
									</Label>
									<span className="text-muted-foreground text-sm">
										{options.maxAdditionalDelay} ms
									</span>
								</div>
								<Slider
									value={[options.maxAdditionalDelay]}
									min={0}
									max={5000}
									step={100}
									onValueChange={(values: number[]) => {
										if (values[0] !== undefined) {
											setOptions({ ...options, maxAdditionalDelay: values[0] });
										}
									}}
								/>
							</div>

							<div className="space-y-2">
								<div className="flex justify-between">
									<Label>Typo Rate: {options.typoRate}</Label>
									<span className="text-muted-foreground text-sm">
										{options.typoRate * 100}%
									</span>
								</div>
								<Slider
									value={[options.typoRate]}
									min={0}
									max={0.3}
									step={0.01}
									onValueChange={(values: number[]) => {
										if (values[0] !== undefined) {
											setOptions({ ...options, typoRate: values[0] });
										}
									}}
								/>
							</div>

							<div className="space-y-2">
								<div className="flex justify-between">
									<Label>Abbreviation Rate: {options.abbreviationRate}</Label>
									<span className="text-muted-foreground text-sm">
										{options.abbreviationRate * 100}%
									</span>
								</div>
								<Slider
									value={[options.abbreviationRate]}
									min={0}
									max={0.5}
									step={0.01}
									onValueChange={(values: number[]) => {
										if (values[0] !== undefined) {
											setOptions({ ...options, abbreviationRate: values[0] });
										}
									}}
								/>
							</div>
						</CardContent>
					</Card> */}

				<Card className="flex h-full flex-col">
					<CardHeader className="border-b pb-3">
						<div className="flex items-center space-x-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
								>
									<path
										fillRule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 16a1 1 0 01-2 0V9a7 7 0 1114 0v7a1 1 0 01-2 0 5.986 5.986 0 00-1.454-3.084A5 5 0 0010 11z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div>
								<CardTitle className="text-base">AI Assistant</CardTitle>
								<CardDescription className="text-xs">Online</CardDescription>
							</div>
						</div>
					</CardHeader>

					<CardContent className="flex flex-grow flex-col p-0">
						{/* Chat messages container */}
						<div
							ref={chatContainerRef}
							className="flex max-h-[500px] min-h-[400px] flex-grow flex-col space-y-2 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-900"
						>
							{messages.map((message) => (
								<div
									key={message.id}
									className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
								>
									<div
										className={`max-w-[80%] break-words rounded-lg px-3 py-2 text-sm ${
											message.isUser
												? "bg-primary text-primary-foreground"
												: "bg-muted"
										}`}
									>
										<div className="whitespace-pre-line">{message.text}</div>
										<div
											className={`mt-1 text-right text-[10px] ${
												message.isUser
													? "text-primary-foreground/80"
													: "text-muted-foreground"
											}`}
										>
											{formatTime(message.timestamp)}
										</div>
									</div>
								</div>
							))}

							{isTyping && (
								<div className="flex justify-start">
									<div className="max-w-[80%] rounded-lg bg-muted px-3 py-2">
										<div className="flex items-center space-x-1">
											<div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
											<div
												className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
												style={{ animationDelay: "0.2s" }}
											/>
											<div
												className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
												style={{ animationDelay: "0.4s" }}
											/>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* Chat input area */}
						<div className="flex border-t p-4">
							<Textarea
								value={customText}
								onChange={(e) => setCustomText(e.target.value)}
								placeholder="Type a message..."
								className="mr-2 min-h-[80px] flex-grow resize-none"
							/>
							<Button
								onClick={() => handleTestClick(customText)}
								disabled={!customText.trim() || isTyping}
								className="flex h-10 w-10 items-center justify-center self-end rounded-full p-0"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
										clipRule="evenodd"
									/>
								</svg>
							</Button>
						</div>
					</CardContent>

					{result && (
						<div className="border-t p-4">
							<Separator className="my-2" />
							<div className="space-y-2">
								<h3 className="mb-2 font-medium">Statistics:</h3>
								<ul className="space-y-1 text-sm">
									<li>Number of chunks: {result.chunks.length}</li>
									<li>Total characters: {result.chunks.join(" ").length}</li>
									<li>
										Average delay:{" "}
										{(
											result.delays.reduce((a, b) => a + b, 0) /
											Math.max(1, result.delays.length)
										).toFixed(0)}
										ms
									</li>
									<li>
										Total simulation time:{" "}
										{result.delays.reduce((a, b) => a + b, 0).toFixed(0)}
										ms
									</li>
								</ul>
							</div>
						</div>
					)}
				</Card>
			</div>
		</div>
	);
}
