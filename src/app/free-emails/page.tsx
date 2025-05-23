/**
 * @see https://formsubmit.co/
 */

"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useState } from "react";
import { FreeEmailCard } from "./components/free-email-card";
import { FreeEmailForm } from "./components/free-email-form";
import { useFreeEmails } from "./hooks/use-free-emails";
import type { FreeEmailFormInput } from "./types";

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

	const { freeEmails, isLoadingEmails, deleteFreeEmail } = useFreeEmails();

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

	const loadingPlaceholderIds = [
		"placeholder-1",
		"placeholder-2",
		"placeholder-3",
	];

	// Prepare edit data for the form
	const prepareEditData = (emailId: string): FreeEmailFormInput => {
		const email = freeEmails.find((email) => email.id === emailId);
		if (!email)
			return {
				email: "",
				alias: "",
				plunkApiKey: "",
				agentId: "",
				wechatPushApiKey: "",
				ccEmails: "",
				redirectUrl: "",
				disableCaptcha: false,
				enableFileUpload: false,
				customWebhooks: "",
			};

		return {
			email: email.email,
			alias: email.alias,
			plunkApiKey: email.plunkApiKey,
			agentId: email.agentId,
			wechatPushApiKey: email.wechatPushApiKey || "",
			ccEmails: email.ccEmails || "",
			redirectUrl: email.redirectUrl || "",
			disableCaptcha: email.disableCaptcha,
			enableFileUpload: email.enableFileUpload,
			customWebhooks: email.customWebhooks || "",
		};
	};

	return (
		<div className="container py-8">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-3xl">免费邮件配置</h1>
					<p className="text-muted-foreground">
						使用 FormSubmit.co 创建表单，自动处理邮件提交
					</p>
				</div>
				<Button onClick={handleOpenCreateDialog}>
					<Plus className="mr-2 h-4 w-4" /> 添加邮件配置
				</Button>
			</div>

			{isLoadingEmails ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{loadingPlaceholderIds.map((id) => (
						<Skeleton key={id} className="h-64 rounded-lg border bg-muted" />
					))}
				</div>
			) : freeEmails.length === 0 ? (
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
							emailData={{
								...email,
								wechatPushApiKey: email.wechatPushApiKey || "",
								ccEmails: email.ccEmails || "",
								redirectUrl: email.redirectUrl || "",
								customWebhooks: email.customWebhooks || "",
							}}
							onEdit={handleOpenEditDialog}
							onDelete={handleDeleteEmail}
						/>
					))}
				</div>
			)}

			{/* Create Dialog */}
			{isCreateDialogOpen && (
				<FreeEmailForm
					open={isCreateDialogOpen}
					onOpenChange={setIsCreateDialogOpen}
					onComplete={handleCreateComplete}
				/>
			)}

			{/* Edit Dialog */}
			{editingEmailId && (
				<FreeEmailForm
					open={!!editingEmailId}
					onOpenChange={(open) => {
						if (!open) setEditingEmailId(null);
					}}
					onComplete={handleEditComplete}
					existingData={prepareEditData(editingEmailId)}
					isEdit={true}
					editId={editingEmailId}
				/>
			)}
		</div>
	);
}
