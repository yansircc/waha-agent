import { api } from "@/trpc/react";
import { useState } from "react";
import { toast } from "sonner";

interface EmailConfigInput {
	id?: string;
	signature?: string | null;
	plunkApiKey: string;
	wechatPushApiKey: string;
	formDataFormId: string;
	formDataWebhookSecret: string;
	agentId: string;
}

export function useEmails() {
	const [isLoading, setIsLoading] = useState(false);
	const utils = api.useUtils();

	// Fetch all email configurations
	const { data: emails = [], isLoading: isLoadingEmails } =
		api.emails.getAll.useQuery();

	// Create a new email configuration
	const { mutate: createEmailMutation } = api.emails.create.useMutation({
		onMutate: () => {
			setIsLoading(true);
		},
		onSuccess: () => {
			toast.success("Email configuration created successfully");
			void utils.emails.getAll.invalidate();
		},
		onError: (error) => {
			toast.error(`Failed to create email configuration: ${error.message}`);
		},
		onSettled: () => {
			setIsLoading(false);
		},
	});

	// Update an existing email configuration
	const { mutate: updateEmailMutation } = api.emails.update.useMutation({
		onMutate: () => {
			setIsLoading(true);
		},
		onSuccess: () => {
			toast.success("Email configuration updated successfully");
			void utils.emails.getAll.invalidate();
		},
		onError: (error) => {
			toast.error(`Failed to update email configuration: ${error.message}`);
		},
		onSettled: () => {
			setIsLoading(false);
		},
	});

	// Delete an email configuration
	const { mutate: deleteEmailMutation } = api.emails.delete.useMutation({
		onMutate: () => {
			setIsLoading(true);
		},
		onSuccess: () => {
			toast.success("Email configuration deleted successfully");
			void utils.emails.getAll.invalidate();
		},
		onError: (error) => {
			toast.error(`Failed to delete email configuration: ${error.message}`);
		},
		onSettled: () => {
			setIsLoading(false);
		},
	});

	// Wrapper functions for the mutations
	const createEmail = async (data: EmailConfigInput) => {
		createEmailMutation(data);
	};

	const updateEmail = async (data: EmailConfigInput & { id: string }) => {
		updateEmailMutation(data);
	};

	const deleteEmail = async (id: string) => {
		deleteEmailMutation({ id });
	};

	return {
		emails,
		isLoadingEmails,
		isLoading,
		createEmail,
		updateEmail,
		deleteEmail,
	};
}
