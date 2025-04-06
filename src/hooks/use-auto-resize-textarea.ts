import { useEffect, useRef } from "react";

type UseAutoResizeTextareaProps = {
	minHeight: number;
	maxHeight: number;
};

export const useAutoResizeTextarea = ({
	minHeight,
	maxHeight,
}: UseAutoResizeTextareaProps) => {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const adjustHeight = () => {
		if (!textareaRef.current) return;

		textareaRef.current.style.height = "auto";
		textareaRef.current.style.height = `${Math.min(
			textareaRef.current.scrollHeight,
			maxHeight,
		)}px`;
	};

	useEffect(() => {
		adjustHeight();
	}, [adjustHeight]);

	return { textareaRef, adjustHeight };
};
