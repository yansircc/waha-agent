import type {
	MyProfile,
	ProfileNameRequest,
	ProfilePictureRequest,
	ProfileStatusRequest,
} from "@/lib/waha-api";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";

interface UseWahaProfileProps {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export function useWahaProfile({
	onSuccess,
	onError,
}: UseWahaProfileProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const utils = api.useUtils();

	// Get my profile
	const getMyProfile = (session = "default") => {
		return api.wahaProfile.getProfile.useQuery({ session });
	};

	// Set profile name
	const setProfileNameMutation = api.wahaProfile.setName.useMutation({
		onSuccess: () => {
			utils.wahaProfile.getProfile.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const setProfileName = async (
		sessionName: string,
		data: ProfileNameRequest,
	) => {
		setIsLoading(true);
		try {
			const result = await setProfileNameMutation.mutateAsync({
				session: sessionName,
				data,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Set profile status
	const setProfileStatusMutation = api.wahaProfile.setStatus.useMutation({
		onSuccess: () => {
			utils.wahaProfile.getProfile.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const setProfileStatus = async (
		sessionName: string,
		data: ProfileStatusRequest,
	) => {
		setIsLoading(true);
		try {
			const result = await setProfileStatusMutation.mutateAsync({
				session: sessionName,
				data,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Set profile picture
	const setProfilePictureMutation = api.wahaProfile.setPicture.useMutation({
		onSuccess: () => {
			utils.wahaProfile.getProfile.invalidate();
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const setProfilePicture = async (
		sessionName: string,
		data: ProfilePictureRequest,
	) => {
		setIsLoading(true);
		try {
			const result = await setProfilePictureMutation.mutateAsync({
				session: sessionName,
				data,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Delete profile picture
	const deleteProfilePictureMutation =
		api.wahaProfile.deletePicture.useMutation({
			onSuccess: () => {
				utils.wahaProfile.getProfile.invalidate();
				onSuccess?.();
			},
			onError: (error) => {
				onError?.(error);
			},
		});

	const deleteProfilePicture = async (sessionName: string) => {
		setIsLoading(true);
		try {
			const result = await deleteProfilePictureMutation.mutateAsync({
				session: sessionName,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	return {
		getMyProfile,
		setProfileName,
		setProfileStatus,
		setProfilePicture,
		deleteProfilePicture,
		isLoading,
	};
}
