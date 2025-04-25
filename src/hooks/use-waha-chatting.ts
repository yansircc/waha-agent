import type { AppRouter } from "@/server/api/root";
import type {
	Button,
	ChatRequest,
	MessageButtonReply,
	MessageContactVcardRequest,
	MessageFileRequest,
	MessageForwardRequest,
	MessageImageRequest,
	MessageLinkPreviewRequest,
	MessageLocationRequest,
	MessagePollRequest,
	MessageReactionRequest,
	MessageReplyRequest,
	MessageStarRequest,
	MessageTextRequest,
	MessageVideoRequest,
	MessageVoiceRequest,
	SendButtonsRequest,
	SendSeenRequest,
	WAMessage,
} from "@/server/api/routers/waha-api";
import { api } from "@/utils/api";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useState } from "react";

interface UseWahaChattingProps {
	onSuccess?: () => void;
	onError?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export function useWahaChatting({
	onSuccess,
	onError,
}: UseWahaChattingProps = {}) {
	const [isLoading, setIsLoading] = useState(false);

	// Send a text message
	const sendTextMutation = api.wahaChatting.sendText.useMutation({
		onSuccess,
		onError,
	});

	const sendText = async (data: MessageTextRequest) => {
		setIsLoading(true);
		try {
			const result = await sendTextMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Send an image
	const sendImageMutation = api.wahaChatting.sendImage.useMutation({
		onSuccess,
		onError,
	});

	const sendImage = async (data: MessageImageRequest) => {
		setIsLoading(true);
		try {
			const result = await sendImageMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Send a file
	const sendFileMutation = api.wahaChatting.sendFile.useMutation({
		onSuccess,
		onError,
	});

	const sendFile = async (data: MessageFileRequest) => {
		setIsLoading(true);
		try {
			const result = await sendFileMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Send a voice message
	const sendVoiceMutation = api.wahaChatting.sendVoice.useMutation({
		onSuccess,
		onError,
	});

	const sendVoice = async (data: MessageVoiceRequest) => {
		setIsLoading(true);
		try {
			const result = await sendVoiceMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Send a video
	const sendVideoMutation = api.wahaChatting.sendVideo.useMutation({
		onSuccess,
		onError,
	});

	const sendVideo = async (data: MessageVideoRequest) => {
		setIsLoading(true);
		try {
			const result = await sendVideoMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Send buttons
	const sendButtonsMutation = api.wahaChatting.sendButtons.useMutation({
		onSuccess,
		onError,
	});

	const sendButtons = async (data: SendButtonsRequest) => {
		setIsLoading(true);
		try {
			const result = await sendButtonsMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Forward a message
	const forwardMessageMutation = api.wahaChatting.forwardMessage.useMutation({
		onSuccess,
		onError,
	});

	const forwardMessage = async (data: MessageForwardRequest) => {
		setIsLoading(true);
		try {
			const result = await forwardMessageMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Mark a chat as seen
	const sendSeenMutation = api.wahaChatting.sendSeen.useMutation({
		onSuccess,
		onError,
	});

	const sendSeen = async (data: SendSeenRequest) => {
		setIsLoading(true);
		try {
			const result = await sendSeenMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Start typing indicator
	const startTypingMutation = api.wahaChatting.startTyping.useMutation({
		onSuccess,
		onError,
	});

	const startTyping = async (data: ChatRequest) => {
		setIsLoading(true);
		try {
			const result = await startTypingMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Stop typing indicator
	const stopTypingMutation = api.wahaChatting.stopTyping.useMutation({
		onSuccess,
		onError,
	});

	const stopTyping = async (data: ChatRequest) => {
		setIsLoading(true);
		try {
			const result = await stopTypingMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// React to a message
	const setReactionMutation = api.wahaChatting.setReaction.useMutation({
		onSuccess,
		onError,
	});

	const setReaction = async (data: MessageReactionRequest) => {
		setIsLoading(true);
		try {
			const result = await setReactionMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Star or unstar a message
	const setStarMutation = api.wahaChatting.setStar.useMutation({
		onSuccess,
		onError,
	});

	const setStar = async (data: MessageStarRequest) => {
		setIsLoading(true);
		try {
			const result = await setStarMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Send a poll
	const sendPollMutation = api.wahaChatting.sendPoll.useMutation({
		onSuccess,
		onError,
	});

	const sendPoll = async (data: MessagePollRequest) => {
		setIsLoading(true);
		try {
			const result = await sendPollMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Send a location
	const sendLocationMutation = api.wahaChatting.sendLocation.useMutation({
		onSuccess,
		onError,
	});

	const sendLocation = async (data: MessageLocationRequest) => {
		setIsLoading(true);
		try {
			const result = await sendLocationMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Send a link with preview
	const sendLinkPreviewMutation = api.wahaChatting.sendLinkPreview.useMutation({
		onSuccess,
		onError,
	});

	const sendLinkPreview = async (data: MessageLinkPreviewRequest) => {
		setIsLoading(true);
		try {
			const result = await sendLinkPreviewMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Send a contact vCard
	const sendContactVcardMutation =
		api.wahaChatting.sendContactVcard.useMutation({
			onSuccess,
			onError,
		});

	const sendContactVcard = async (data: MessageContactVcardRequest) => {
		setIsLoading(true);
		try {
			const result = await sendContactVcardMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Reply to a button message
	const sendButtonsReplyMutation =
		api.wahaChatting.sendButtonsReply.useMutation({
			onSuccess,
			onError,
		});

	const sendButtonsReply = async (data: MessageButtonReply) => {
		setIsLoading(true);
		try {
			const result = await sendButtonsReplyMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	// Reply to a message (deprecated)
	const replyMutation = api.wahaChatting.reply.useMutation({
		onSuccess,
		onError,
	});

	const reply = async (data: MessageReplyRequest) => {
		setIsLoading(true);
		try {
			const result = await replyMutation.mutateAsync(data);
			setIsLoading(false);
			return result;
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	return {
		sendText,
		sendImage,
		sendFile,
		sendVoice,
		sendVideo,
		sendButtons,
		forwardMessage,
		sendSeen,
		startTyping,
		stopTyping,
		setReaction,
		setStar,
		sendPoll,
		sendLocation,
		sendLinkPreview,
		sendContactVcard,
		sendButtonsReply,
		reply,
		isLoading,
	};
}
