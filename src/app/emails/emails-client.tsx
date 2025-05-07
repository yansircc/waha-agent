"use client";

import { useAgents } from "@/app/agents/hooks/use-agents";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { EmailCard } from "./components/email-card";
import { EmailConfigDialog } from "./components/email-config-dialog";
import { useEmails } from "./hooks/use-emails";

export default function EmailsPage() {
	const [isCreatingEmail, setIsCreatingEmail] = useState(false);
	const [editingEmailId, setEditingEmailId] = useState<string | null>(null);

	const { emails, isLoadingEmails, createEmail, updateEmail, deleteEmail } =
		useEmails();
	const { agents } = useAgents();

	const handleOpenCreateDialog = () => {
		setIsCreatingEmail(true);
	};

	const handleOpenEditDialog = (emailId: string) => {
		setEditingEmailId(emailId);
	};

	const handleCloseDialog = () => {
		setIsCreatingEmail(false);
		setEditingEmailId(null);
	};

	const handleSubmit = (data: {
		id?: string;
		signature?: string;
		plunkApiKey: string;
		wechatPushApiKey: string;
		formDataFormId: string;
		formDataWebhookSecret: string;
		agentId: string;
	}) => {
		if (data.id) {
			updateEmail({
				...data,
				id: data.id,
			});
		} else {
			createEmail({
				...data,
			});
		}
		handleCloseDialog();
	};

	const handleDeleteEmail = (emailId: string) => {
		if (
			window.confirm(
				"Are you sure you want to delete this email configuration?",
			)
		) {
			deleteEmail(emailId);
		}
	};

	const editingEmail = editingEmailId
		? emails.find((email) => email.id === editingEmailId)
		: null;

	const formDefaultValues = editingEmail
		? {
				id: editingEmail.id,
				signature: editingEmail.signature ?? undefined,
				plunkApiKey: editingEmail.plunkApiKey,
				wechatPushApiKey: editingEmail.wechatPushApiKey,
				formDataFormId: editingEmail.formDataFormId,
				formDataWebhookSecret: editingEmail.formDataWebhookSecret,
				agentId: editingEmail.agentId,
			}
		: undefined;

	const loadingPlaceholderIds = [
		"placeholder-1",
		"placeholder-2",
		"placeholder-3",
	];

	return (
		<div className="container py-8">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="font-bold text-3xl">邮件配置</h1>
				<Button onClick={handleOpenCreateDialog}>
					<Plus className="mr-2 h-4 w-4" /> 添加邮件配置
				</Button>
			</div>

			{isLoadingEmails ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{loadingPlaceholderIds.map((id) => (
						<div
							key={id}
							className="h-64 animate-pulse rounded-lg border bg-muted"
						/>
					))}
				</div>
			) : emails.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border bg-background p-12 text-center">
					<h2 className="mb-2 font-semibold text-xl">还没有邮件配置</h2>
					<p className="mb-6 text-muted-foreground">
						创建你的第一个邮件配置来开始自动处理表单提交
					</p>
					<Button onClick={handleOpenCreateDialog}>
						<Plus className="mr-2 h-4 w-4" /> 添加邮件配置
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{emails.map((email) => (
						<EmailCard
							key={email.id}
							id={email.id}
							plunkApiKey={email.plunkApiKey}
							wechatPushApiKey={email.wechatPushApiKey}
							formDataFormId={email.formDataFormId}
							formDataWebhookSecret={email.formDataWebhookSecret}
							agentId={email.agentId}
							agent={email.agent}
							onEdit={() => handleOpenEditDialog(email.id)}
							onDelete={() => handleDeleteEmail(email.id)}
							createdAt={email.createdAt}
							updatedAt={email.updatedAt}
						/>
					))}
				</div>
			)}

			{(isCreatingEmail || editingEmailId) && (
				<EmailConfigDialog
					open={isCreatingEmail || !!editingEmailId}
					onOpenChange={handleCloseDialog}
					onSubmit={handleSubmit}
					agents={agents}
					defaultValues={formDefaultValues}
					mode={editingEmailId ? "edit" : "create"}
				/>
			)}
		</div>
	);
}
