"use client";

import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils";
import { CornerRightUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function AIInput_07() {
	const [inputValue, setInputValue] = useState("");
	const [submitted, setSubmitted] = useState(true);
	const [isAnimating, setIsAnimating] = useState(true);
	const { textareaRef, adjustHeight } = useAutoResizeTextarea({
		minHeight: 56,
		maxHeight: 200,
	});

	useEffect(() => {
		let timeoutId: NodeJS.Timeout;

		const runAnimation = () => {
			if (!isAnimating) return;
			setSubmitted(true);
			timeoutId = setTimeout(() => {
				setSubmitted(false);
				timeoutId = setTimeout(runAnimation, 1000);
			}, 3000);
		};

		if (isAnimating) {
			runAnimation();
		}

		return () => clearTimeout(timeoutId);
	}, [isAnimating]);

	return (
		<div className="w-full py-4">
			<div className="relative mx-auto flex w-full max-w-xl flex-col items-start gap-2">
				<div className="relative mx-auto w-full max-w-xl">
					<Textarea
						id="ai-input-07"
						placeholder="Ask me anything!"
						className={cn(
							"w-full max-w-xl resize-none text-wrap rounded-3xl border-none bg-black/5 py-4 pr-10 pl-6 text-black leading-[1.2] ring-black/30 placeholder:text-black/70 dark:bg-white/5 dark:text-white dark:ring-white/30 dark:placeholder:text-white/70",
							"min-h-[56px]",
						)}
						ref={textareaRef}
						value={inputValue}
						onChange={(e) => {
							setInputValue(e.target.value);
							adjustHeight();
						}}
						disabled={submitted}
					/>
					<button
						className={cn(
							"-translate-y-1/2 absolute top-1/2 right-3 rounded-xl px-1 py-1",
							submitted ? "bg-none" : "bg-black/5 dark:bg-white/5",
						)}
						type="button"
					>
						{submitted ? (
							<div
								className="h-4 w-4 animate-spin rounded-sm bg-black transition duration-700 dark:bg-white"
								style={{ animationDuration: "3s" }}
							/>
						) : (
							<CornerRightUp
								className={cn(
									"h-4 w-4 transition-opacity dark:text-white",
									inputValue ? "opacity-100" : "opacity-30",
								)}
							/>
						)}
					</button>
				</div>
				<p className="mx-auto h-4 pl-4 text-black/70 text-xs dark:text-white/70">
					{submitted ? "AI is thinking..." : "Ready to submit!"}
				</p>
			</div>
		</div>
	);
}
