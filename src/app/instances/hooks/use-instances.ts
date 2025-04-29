import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";

interface UseInstancesProps {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export function useInstances({ onSuccess, onError }: UseInstancesProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const utils = api.useUtils();

	// Get all instances
	const instancesQuery = api.instances.getAll.useQuery();

	// Get instance by ID
	const getInstanceById = (id: string) => {
		return api.instances.getById.useQuery({ id });
	};

	// Create a new instance
	const createInstanceMutation = api.instances.create.useMutation({
		onSuccess: () => {
			utils.instances.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const createInstance = async (data: {
		name: string;
		phoneNumber?: string;
		agentId?: string;
	}) => {
		setIsLoading(true);
		try {
			const result = await createInstanceMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Update an instance
	const updateInstanceMutation = api.instances.update.useMutation({
		onSuccess: () => {
			utils.instances.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const updateInstance = async (data: {
		id: string;
		name?: string;
		phoneNumber?: string;
		agentId?: string;
		status?: "connected" | "disconnected" | "connecting";
		qrCode?: string;
		sessionData?: Record<string, unknown>;
	}) => {
		setIsLoading(true);
		try {
			const result = await updateInstanceMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Delete an instance
	const deleteInstanceMutation = api.instances.delete.useMutation({
		onSuccess: () => {
			utils.instances.getAll.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const deleteInstance = async (id: string) => {
		setIsLoading(true);
		try {
			const result = await deleteInstanceMutation.mutateAsync({ id });
			setIsLoading(false);
			return result;
		} catch (error: unknown) {
			setIsLoading(false);
			throw error;
		}
	};

	// Check for QR code
	const checkForQRCodeMutation = api.instances.checkForQRCode.useMutation({
		onSuccess: () => {
			utils.instances.getAll.invalidate();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const checkForQRCode = async (id: string) => {
		return await checkForQRCodeMutation.mutateAsync({ id });
	};

	return {
		instances: instancesQuery.data || [],
		isLoadingInstances: instancesQuery.isLoading,
		getInstanceById,
		createInstance,
		updateInstance,
		deleteInstance,
		checkForQRCode,
		isLoading,
	};
}
