"use client";

import { useState } from "react";
import { useKbStore } from "./store";
import { useKbApi } from "./use-kb-api";

/**
 * 提供添加知识库对话框的状态管理和操作
 */
export function useAddKbDialog() {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Store actions
	const isAddKbOpen = useKbStore((state) => state.isAddKbOpen);
	const setIsAddKbOpen = useKbStore((state) => state.setIsAddKbOpen);

	// KB API
	const { createKb } = useKbApi();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim() || isSubmitting) return;

		setIsSubmitting(true);
		try {
			await createKb({
				name: name.trim(),
				description: description.trim(),
				content: "",
			});

			handleClose();
		} catch (error) {
			console.error("Failed to create knowledge base:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setIsAddKbOpen(false);
		setName("");
		setDescription("");
	};

	return {
		name,
		setName,
		description,
		setDescription,
		isSubmitting,
		isOpen: isAddKbOpen,
		onOpenChange: setIsAddKbOpen,
		handleSubmit,
		handleClose,
	};
}
