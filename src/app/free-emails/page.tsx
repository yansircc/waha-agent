/**
 * 使用 formsubmit.co
 * 1. 创建一个新邮件卡，询问用户邮箱地址，此时，formsubmit.co 会发送一封确认邮件到用户邮箱
 * 2. 用户点击确认邮件中的链接后，formsubmit.co 会生成一个 用户 email address 的别名
 * 3. 此时在用户提交了邮箱地址后，会询问用户的这个别名，用户输入别名后进入下一步
 * 4. 让用户填入 plunk 的 api key，告知用户这是为了用 plunk 来进行自动回复
 * 5. 让用户填入 wechat push 的 api key，告知用户这是为了用 wechat push 来进行自动回复
 * 6. 用户全部填写完成，保存邮件卡，如果用户没填完，用户退出之后，可以再次进入邮件卡，继续填写
 *
 * 注意：因为Email address 具备唯一性，且 Email address 对应的别名具备唯一性，所以需要对 Email address 和 Email address 进行强制存储（即使用户删除，也要强制存储）
 * 用户在新添加时，先检查 Email address 和别名是否存在，如果存在，则直接跳过第一步，否则视为新增邮件
 *
 * @see https://formsubmit.co/
 */

"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { FormConfigAltert } from "./components/form-config-altert";
import { FreeEmailCard } from "./components/free-email-card";
import { FreeEmailForm } from "./components/free-email-form";
import { useFreeEmails } from "./hooks/use-free-emails";

// Simple Skeleton component
const Skeleton = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => {
	return (
		<div
			className={cn("animate-pulse rounded-md bg-muted", className)}
			{...props}
		/>
	);
};

export default function FreeEmailsPage() {
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
	const [isRefreshingState, setIsRefreshingState] = useState(false);

	const {
		freeEmails,
		formState: savedFormState,
		isFormStateLoaded,
		isLoadingEmails,
		deleteFreeEmail,
		clearFormState,
		refreshFormState,
	} = useFreeEmails();

	// 检查是否有未完成的表单
	const hasIncompleteForm =
		isFormStateLoaded &&
		savedFormState &&
		savedFormState.emailAddress &&
		(!savedFormState.alias ||
			!savedFormState.plunkApiKey ||
			!savedFormState.wechatPushApiKey ||
			!savedFormState.setupCompleted);

	const handleOpenCreateDialog = () => {
		setIsCreateDialogOpen(true);
	};

	const handleOpenEditDialog = (id: string) => {
		setEditingEmailId(id);
	};

	const handleDeleteEmail = (id: string) => {
		if (window.confirm("确定要删除这个邮件配置吗？")) {
			void deleteFreeEmail(id);
		}
	};

	const handleCreateComplete = () => {
		setIsCreateDialogOpen(false);
	};

	const handleEditComplete = () => {
		setEditingEmailId(null);
	};

	// 刷新表单状态
	const handleRefreshFormState = async () => {
		setIsRefreshingState(true);
		try {
			await refreshFormState();
		} finally {
			setIsRefreshingState(false);
		}
	};

	// 重置未完成的表单
	const handleResetIncompleteForm = async () => {
		if (window.confirm("确定要放弃当前未完成的设置吗？")) {
			await clearFormState();
		}
	};

	// 将未完成表单数据转换为显示格式
	const getIncompleteFormStatus = () => {
		if (!savedFormState) return "未知";

		if (savedFormState.emailAddress && !savedFormState.alias) {
			return "已提交邮箱，等待您输入FormSubmit别名";
		}

		if (savedFormState.alias && !savedFormState.plunkApiKey) {
			return "已设置别名，等待配置Plunk API";
		}

		if (savedFormState.plunkApiKey && !savedFormState.wechatPushApiKey) {
			return "已配置Plunk API，等待设置微信推送";
		}

		return "部分完成";
	};

	const loadingPlaceholderIds = [
		"placeholder-1",
		"placeholder-2",
		"placeholder-3",
	];

	// 准备编辑数据时进行null安全转换
	const prepareEditData = (emailId: string) => {
		const email = freeEmails.find((email) => email.id === emailId);
		if (!email) return {};

		return {
			emailAddress: email.emailAddress,
			alias: email.alias || "",
			plunkApiKey: email.plunkApiKey || "",
			wechatPushApiKey: email.wechatPushApiKey || "",
			formSubmitActivated: email.formSubmitActivated,
			setupCompleted: email.setupCompleted,
		};
	};

	// 获取未完成的邮箱地址
	const _getIncompleteEmailAddress = () => {
		const emailAddress = savedFormState?.emailAddress;
		return typeof emailAddress === "string" ? emailAddress : "";
	};

	return (
		<div className="container py-8">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="font-bold text-3xl">免费邮件配置</h1>
				<Button onClick={handleOpenCreateDialog}>
					<Plus className="mr-2 h-4 w-4" /> 添加邮件配置
				</Button>
			</div>

			{!isFormStateLoaded && (
				<Alert className="mb-8 border-blue-200 bg-blue-50">
					<Loader2 className="h-4 w-4 animate-spin text-blue-500" />
					<AlertTitle className="text-blue-700">正在加载配置数据...</AlertTitle>
					<AlertDescription className="text-blue-600">
						请稍等，正在检查是否有未完成的邮件配置。
					</AlertDescription>
				</Alert>
			)}

			<FormConfigAltert
				hasIncompleteForm={Boolean(hasIncompleteForm)}
				savedFormState={savedFormState}
				getIncompleteFormStatus={getIncompleteFormStatus}
				handleOpenCreateDialog={handleOpenCreateDialog}
				handleResetIncompleteForm={handleResetIncompleteForm}
				handleRefreshFormState={handleRefreshFormState}
				isRefreshingState={isRefreshingState}
			/>

			{isLoadingEmails ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{loadingPlaceholderIds.map((id) => (
						<Skeleton key={id} className="h-64 rounded-lg border bg-muted" />
					))}
				</div>
			) : freeEmails.length === 0 && !hasIncompleteForm ? (
				<div className="flex flex-col items-center justify-center rounded-lg border bg-background p-12 text-center">
					<h2 className="mb-2 font-semibold text-xl">还没有邮件配置</h2>
					<p className="mb-6 text-muted-foreground">
						创建你的第一个免费邮件配置来开始自动处理表单提交
					</p>
					<Button onClick={handleOpenCreateDialog}>
						<Plus className="mr-2 h-4 w-4" /> 添加邮件配置
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{freeEmails.map((email) => (
						<FreeEmailCard
							key={email.id}
							emailData={email}
							onEdit={handleOpenEditDialog}
							onDelete={handleDeleteEmail}
						/>
					))}
				</div>
			)}

			{isCreateDialogOpen && (
				<FreeEmailForm
					open={isCreateDialogOpen}
					onOpenChange={setIsCreateDialogOpen}
					onComplete={handleCreateComplete}
				/>
			)}

			{editingEmailId && (
				<FreeEmailForm
					open={!!editingEmailId}
					onOpenChange={(open) => {
						if (!open) setEditingEmailId(null);
					}}
					onComplete={handleEditComplete}
					existingData={prepareEditData(editingEmailId)}
				/>
			)}
		</div>
	);
}
