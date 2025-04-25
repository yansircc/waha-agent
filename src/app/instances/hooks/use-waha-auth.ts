import type { AppRouter } from "@/server/api/root";
import type {
	Base64File,
	QRCodeValue,
	RequestCodeRequest,
} from "@/server/api/routers/waha-api";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";

interface UseWahaAuthProps {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export function useWahaAuth({ onSuccess, onError }: UseWahaAuthProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const utils = api.useUtils();

	// Get QR Code query hook (for components)
	const getQRCode = (
		session = "default",
		format: "image" | "raw" = "image",
	) => {
		return api.wahaAuth.getQR.useQuery(
			{ session, format },
			{
				refetchInterval: false, // 禁用自动轮询，由用户手动触发刷新
			},
		);
	};

	// Imperative version for use in callbacks/event handlers
	const fetchQRCode = async (
		session = "default",
		format: "image" | "raw" = "image",
	) => {
		setIsLoading(true);
		try {
			const result = await utils.wahaAuth.getQR.fetch({ session, format });
			setIsLoading(false);
			return result;
		} catch (error) {
			console.error("获取二维码时出错:", error);
			setIsLoading(false);
			// Return null instead of throwing to allow for graceful fallback
			return null;
		}
	};

	// Request authentication code
	const requestCodeMutation = api.wahaAuth.requestCode.useMutation({
		onSuccess: () => {
			onSuccess?.();
		},
		onError: (error) => {
			onError?.(error);
		},
	});

	const requestCode = async (session: string, data: RequestCodeRequest) => {
		setIsLoading(true);
		try {
			const result = await requestCodeMutation.mutateAsync({
				session,
				data,
			});
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	return {
		getQRCode,
		fetchQRCode,
		requestCode,
		isLoading,
	};
}
