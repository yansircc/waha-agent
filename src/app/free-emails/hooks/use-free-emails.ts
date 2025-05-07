import { api } from "@/utils/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { FreeEmailFormInput } from "../types";

export function useFreeEmails() {
	const [isLoading, setIsLoading] = useState(false);
	const [formStateLoaded, setFormStateLoaded] = useState(false);
	const [localFormState, setLocalFormState] = useState<Record<
		string,
		unknown
	> | null>(null);

	const utils = api.useUtils();

	// Fetch free emails from the API
	const { data: freeEmails = [], isLoading: isLoadingEmails } =
		api.freeEmails.getAll.useQuery();

	// Fetch form state with error handling
	const {
		data: remoteFormState,
		isLoading: isLoadingFormState,
		error: formStateError,
		refetch: refetchFormState,
	} = api.freeEmails.getFormState.useQuery(undefined, {
		retry: 2,
		retryDelay: 1000,
		staleTime: 30000, // 30 seconds
	});

	// Handle form state loading/error
	useEffect(() => {
		if (!isLoadingFormState) {
			if (remoteFormState) {
				setLocalFormState(remoteFormState as Record<string, unknown>);
			}
			if (formStateError) {
				console.error("Failed to load form state from Redis:", formStateError);
				// Even if there's an error, we mark as loaded so the UI can proceed
			}
			setFormStateLoaded(true);
		}
	}, [remoteFormState, isLoadingFormState, formStateError]);

	// Create mutation
	const { mutate: createEmailMutation } = api.freeEmails.create.useMutation({
		onMutate: () => {
			setIsLoading(true);
		},
		onSuccess: () => {
			toast.success("免费邮件配置创建成功");
			void utils.freeEmails.getAll.invalidate();
			// Clear form state upon successful creation
			void clearFormState();
		},
		onError: (error) => {
			toast.error(`创建邮件配置失败: ${error.message}`);
		},
		onSettled: () => {
			setIsLoading(false);
		},
	});

	// Update mutation
	const { mutate: updateEmailMutation } = api.freeEmails.update.useMutation({
		onMutate: () => {
			setIsLoading(true);
		},
		onSuccess: () => {
			toast.success("邮件配置更新成功");
			void utils.freeEmails.getAll.invalidate();
		},
		onError: (error) => {
			toast.error(`更新邮件配置失败: ${error.message}`);
		},
		onSettled: () => {
			setIsLoading(false);
		},
	});

	// Delete mutation
	const { mutate: deleteEmailMutation } = api.freeEmails.delete.useMutation({
		onMutate: () => {
			setIsLoading(true);
		},
		onSuccess: () => {
			toast.success("邮件配置已删除");
			void utils.freeEmails.getAll.invalidate();
		},
		onError: (error) => {
			toast.error(`删除邮件配置失败: ${error.message}`);
		},
		onSettled: () => {
			setIsLoading(false);
		},
	});

	// Redis form state operations with fallback to local state
	const { mutate: saveFormStateMutation, isPending: isSavingFormState } =
		api.freeEmails.saveFormState.useMutation({
			onSuccess: (data) => {
				// Update local state when form state is saved remotely
				setLocalFormState(data as Record<string, unknown>);
			},
			onError: (error) => {
				console.error("Failed to save form state to Redis:", error);
				// We don't show errors to the user here, as we're still maintaining local state
			},
		});

	const { mutate: clearFormStateMutation, isPending: isClearingFormState } =
		api.freeEmails.clearFormState.useMutation({
			onSuccess: () => {
				// Clear local state when remote state is cleared
				setLocalFormState(null);
			},
			onError: (error) => {
				console.error("Failed to clear form state from Redis:", error);
				// We still clear local state even if Redis fails
				setLocalFormState(null);
			},
		});

	// Helper functions
	const createFreeEmail = async (data: FreeEmailFormInput): Promise<void> => {
		createEmailMutation(data);
	};

	const updateFreeEmail = async (
		id: string,
		data: Partial<FreeEmailFormInput>,
	): Promise<void> => {
		updateEmailMutation({ id, data });
	};

	const deleteFreeEmail = async (id: string): Promise<void> => {
		deleteEmailMutation({ id });
	};

	const saveFormState = async (
		data: Partial<FreeEmailFormInput>,
	): Promise<void> => {
		// Update local state immediately for responsive UI
		setLocalFormState((prev) => ({
			...prev,
			...data,
		}));

		// Try to update remote state in background
		saveFormStateMutation({ formData: data });
	};

	const clearFormState = async (): Promise<void> => {
		// Clear local state immediately for responsive UI
		setLocalFormState(null);

		// Try to clear remote state in background
		clearFormStateMutation();
	};

	// Refetch form state if needed
	const refreshFormState = () => {
		void refetchFormState();
	};

	return {
		freeEmails,
		formState: localFormState,
		isFormStateLoaded: formStateLoaded,
		isLoading,
		isLoadingEmails,
		isLoadingFormState,
		isSavingFormState,
		isClearingFormState,
		createFreeEmail,
		updateFreeEmail,
		deleteFreeEmail,
		saveFormState,
		clearFormState,
		refreshFormState,
	};
}
