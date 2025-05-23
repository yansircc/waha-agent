import { api } from "@/utils/api";
import { useState } from "react";
import { toast } from "sonner";
import type { FreeEmailFormInput } from "../types";

export function useFreeEmails() {
	const [isLoading, setIsLoading] = useState(false);

	const utils = api.useUtils();

	// Fetch free emails from the API
	const { data: freeEmails = [], isLoading: isLoadingEmails } =
		api.freeEmails.getAll.useQuery();

	// Create mutation
	const { mutate: createEmailMutation } = api.freeEmails.create.useMutation({
		onMutate: () => {
			setIsLoading(true);
		},
		onSuccess: () => {
			toast.success("免费邮件配置创建成功");
			void utils.freeEmails.getAll.invalidate();
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

	return {
		freeEmails,
		isLoading,
		isLoadingEmails,
		createFreeEmail,
		updateFreeEmail,
		deleteFreeEmail,
	};
}
