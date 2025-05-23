"use client";
import { useAgents } from "@/app/agents/hooks/use-agents";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { env } from "@/env";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import {
	AlertCircle,
	Bot,
	CheckCircle2,
	ChevronDown,
	Code2,
	ExternalLink,
	Eye,
	EyeOff,
	Hash,
	Key,
	Loader2,
	Mail,
	Settings,
	Shield,
	Upload,
	Webhook,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useFreeEmails } from "../hooks/use-free-emails";
import { freeEmailApiService } from "../services/free-email-api";
import { type FreeEmailFormInput, freeEmailFormSchema } from "../types";

// 错误提示组件
function FieldInfo({ field }: { field: AnyFieldApi }) {
	return (
		<>
			{field.state.meta.isTouched && !field.state.meta.isValid ? (
				<p className="flex items-center gap-1 text-destructive text-sm">
					<AlertCircle className="h-3 w-3" />
					{field.state.meta.errors.map((err) => err.message || err).join(", ")}
				</p>
			) : null}
			{field.state.meta.isValidating ? (
				<p className="flex items-center gap-1 text-blue-500 text-sm">
					<Loader2 className="h-3 w-3 animate-spin" />
					验证中...
				</p>
			) : null}
		</>
	);
}

interface FreeEmailFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onComplete: () => void;
	existingData?: Partial<FreeEmailFormInput>;
	isEdit?: boolean;
	editId?: string;
}

export function FreeEmailForm({
	open,
	onOpenChange,
	onComplete,
	existingData = {},
	isEdit = false,
	editId,
}: FreeEmailFormProps) {
	const [_, setIsSubmitting] = useState(false);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [showPreview, setShowPreview] = useState(false);
	const [showApiKeys, setShowApiKeys] = useState(false);

	const { createFreeEmail, updateFreeEmail } = useFreeEmails();
	const { agents } = useAgents();

	const form = useForm({
		defaultValues: {
			email: existingData.email || "",
			alias: existingData.alias || "",
			plunkApiKey: existingData.plunkApiKey || "",
			agentId: existingData.agentId || "",
			wechatPushApiKey: existingData.wechatPushApiKey || "",
			ccEmails: existingData.ccEmails || "",
			redirectUrl: existingData.redirectUrl || "",
			disableCaptcha: existingData.disableCaptcha || false,
			enableFileUpload: existingData.enableFileUpload || false,
			customWebhooks: existingData.customWebhooks || "",
		} as FreeEmailFormInput,
		validators: {
			onSubmit: freeEmailFormSchema,
		},
		onSubmit: async ({ value }) => {
			await handleSubmit(value);
		},
	});

	// Generate form code preview
	const generatePreview = () => {
		const formValues = form.state.values;
		try {
			return freeEmailApiService.generateFormCode(
				formValues,
				env.NEXT_PUBLIC_APP_URL,
			);
		} catch {
			return "请填写完整信息以预览表单代码";
		}
	};

	const handleSubmit = async (data: FreeEmailFormInput) => {
		setIsSubmitting(true);
		try {
			if (isEdit && editId) {
				await updateFreeEmail(editId, data);
			} else {
				await createFreeEmail(data);
			}

			onOpenChange(false);
			onComplete();
		} catch (error) {
			console.error("Error saving email configuration:", error);
			toast.error("保存失败，请重试");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
				<DialogHeader className="space-y-3">
					<DialogTitle className="flex items-center gap-2 text-xl">
						<Mail className="h-5 w-5 text-blue-600" />
						{isEdit ? "编辑邮件配置" : "创建新的邮件配置"}
					</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						配置您的FormSubmit邮件服务，生成专属表单代码用于您的网站
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6"
				>
					{/* 基本配置 */}
					<Card>
						<CardHeader className="pb-4">
							<CardTitle className="flex items-center gap-2 text-lg">
								<Hash className="h-4 w-4 text-blue-600" />
								基本配置
							</CardTitle>
							<CardDescription>
								设置您的FormSubmit别名和邮件服务密钥
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<form.Field
								name="email"
								validators={{
									onBlur: z.string().email("请输入有效的邮箱地址"),
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label
											htmlFor={field.name}
											className="flex items-center gap-2"
										>
											<Hash className="h-3 w-3" />
											邮箱地址 *
										</Label>
										<Input
											id={field.name}
											name={field.name}
											placeholder="your-email@example.com"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											className="font-mono"
										/>
										<p className="flex items-center gap-1 text-muted-foreground text-xs">
											<AlertCircle className="h-3 w-3" />
											用于接收表单提交的邮件
										</p>
										<FieldInfo field={field} />
									</div>
								)}
							</form.Field>

							<form.Field
								name="alias"
								validators={{
									onBlur: z.string().min(1, "请输入FormSubmit.co的别名"),
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label
											htmlFor={field.name}
											className="flex items-center gap-2"
										>
											<Hash className="h-3 w-3" />
											FormSubmit 别名 *
										</Label>
										<Input
											id={field.name}
											name={field.name}
											placeholder="your-unique-alias"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											className="font-mono"
										/>
										<p className="flex items-center gap-1 text-muted-foreground text-xs">
											<AlertCircle className="h-3 w-3" />
											从FormSubmit.co获得的唯一标识符
										</p>
										<FieldInfo field={field} />
									</div>
								)}
							</form.Field>

							<form.Field
								name="plunkApiKey"
								validators={{
									onBlur: z
										.string()
										.startsWith("sk_", "请输入Plunk API密钥，应以 'sk_' 开头"),
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<Label
												htmlFor={field.name}
												className="flex items-center gap-2"
											>
												<Key className="h-3 w-3" />
												Plunk API 密钥 *
											</Label>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => setShowApiKeys(!showApiKeys)}
												className="h-6 text-xs"
											>
												{showApiKeys ? (
													<>
														<EyeOff className="mr-1 h-3 w-3" />
														隐藏
													</>
												) : (
													<>
														<Eye className="mr-1 h-3 w-3" />
														显示
													</>
												)}
											</Button>
										</div>
										<Input
											id={field.name}
											name={field.name}
											placeholder="sk_..."
											type={showApiKeys ? "text" : "password"}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											className="font-mono"
										/>
										<p className="flex items-center gap-1 text-muted-foreground text-xs">
											<CheckCircle2 className="h-3 w-3" />
											用于自动邮件回复功能
										</p>
										<FieldInfo field={field} />
									</div>
								)}
							</form.Field>

							<form.Field
								name="agentId"
								validators={{
									onBlur: z.string().min(1, "请选择AI Agent"),
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label
											htmlFor={field.name}
											className="flex items-center gap-2"
										>
											<Bot className="h-3 w-3" />
											AI Agent *
										</Label>
										<Select
											value={field.state.value}
											onValueChange={field.handleChange}
										>
											<SelectTrigger>
												<SelectValue placeholder="请选择AI Agent" />
											</SelectTrigger>
											<SelectContent>
												{agents.map((agent: { id: string; name: string }) => (
													<SelectItem key={agent.id} value={agent.id}>
														{agent.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<p className="flex items-center gap-1 text-muted-foreground text-xs">
											<CheckCircle2 className="h-3 w-3" />
											将生成邮件回复的AI Agent
										</p>
										<FieldInfo field={field} />
									</div>
								)}
							</form.Field>
						</CardContent>
					</Card>

					{/* 高级选项 */}
					<Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
						<CollapsibleTrigger asChild>
							<Button
								variant="outline"
								type="button"
								className="h-12 w-full justify-between text-sm"
								size="lg"
							>
								<div className="flex items-center gap-2">
									<Settings className="h-4 w-4 text-blue-600" />
									高级选项
								</div>
								<ChevronDown
									className={`h-4 w-4 transition-transform duration-200 ${
										showAdvanced ? "rotate-180" : ""
									}`}
								/>
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="space-y-4 pt-4">
							<Card>
								<CardHeader className="pb-4">
									<CardTitle className="text-base">通知与集成</CardTitle>
									<CardDescription>
										配置额外的通知服务和邮件选项
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<form.Field
										name="wechatPushApiKey"
										validators={{
											onBlur: z.union([
												z
													.string()
													.startsWith(
														"SCT",
														"请输入微信推送API密钥，应以 'SCT' 开头",
													),
												z.literal(""),
											]),
										}}
									>
										{(field) => (
											<div className="space-y-2">
												<Label
													htmlFor={field.name}
													className="flex items-center gap-2"
												>
													<Mail className="h-3 w-3" />
													微信推送API密钥 (可选)
												</Label>
												<Input
													id={field.name}
													name={field.name}
													placeholder="SCT..."
													type={showApiKeys ? "text" : "password"}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													className="font-mono"
												/>
												<p className="text-muted-foreground text-xs">
													用于微信通知，可选配置
												</p>
												<FieldInfo field={field} />
											</div>
										)}
									</form.Field>

									<form.Field
										name="ccEmails"
										validators={{
											onBlur: ({ value }) => {
												if (value.includes("，")) {
													return "请使用英文逗号(,)分隔邮箱";
												}
												if (!value.trim()) return undefined;
												const emails = value
													.split(",")
													.map((email) => email.trim());
												const invalidEmails = emails.filter(
													(email) =>
														!z.string().email().safeParse(email).success,
												);
												if (invalidEmails.length > 0) {
													return "请输入有效的邮箱地址，多个邮箱用英文逗号分隔";
												}
												return undefined;
											},
										}}
									>
										{(field) => (
											<div className="space-y-2">
												<Label
													htmlFor={field.name}
													className="flex items-center gap-2"
												>
													<Mail className="h-3 w-3" />
													抄送邮箱
												</Label>
												<Input
													id={field.name}
													name={field.name}
													placeholder="email1@example.com, email2@example.com"
													disabled={true}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
												/>
												{/* <p className="text-muted-foreground text-xs">
													多个邮箱用逗号分隔，将收到表单提交的副本
												</p> */}
												<p className="text-muted-foreground text-xs">
													暂不开放此功能，submitform.co 尚未完整支持
												</p>
												<FieldInfo field={field} />
											</div>
										)}
									</form.Field>

									<form.Field
										name="redirectUrl"
										validators={{
											onBlur: z.union([
												z.string().url("请输入有效的URL"),
												z.literal(""),
											]),
										}}
									>
										{(field) => (
											<div className="space-y-2">
												<Label
													htmlFor={field.name}
													className="flex items-center gap-2"
												>
													<ExternalLink className="h-3 w-3" />
													提交后跳转页面
												</Label>
												<Input
													id={field.name}
													name={field.name}
													placeholder="https://your-website.com/thanks"
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
												/>
												<p className="text-muted-foreground text-xs">
													表单提交成功后跳转的页面URL
												</p>
												<FieldInfo field={field} />
											</div>
										)}
									</form.Field>

									<form.Field
										name="customWebhooks"
										validators={{
											onBlur: ({ value }) => {
												if (!value.trim()) return undefined;
												if (value.includes("，")) {
													return "请使用英文逗号(,)分隔URL";
												}
												const urls = value.split(",").map((url) => url.trim());
												const invalidUrls = urls.filter(
													(url) => !z.string().url().safeParse(url).success,
												);
												if (invalidUrls.length > 0) {
													return "请输入有效的URL，多个URL用逗号分隔";
												}
												return undefined;
											},
										}}
									>
										{(field) => (
											<div className="space-y-2">
												<Label
													htmlFor={field.name}
													className="flex items-center gap-2"
												>
													<Webhook className="h-3 w-3" />
													自定义Webhooks
												</Label>
												<Textarea
													id={field.name}
													name={field.name}
													placeholder="https://webhook1.com, https://webhook2.com"
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													rows={3}
												/>
												<p className="text-muted-foreground text-xs">
													多个webhook URL用逗号分隔
												</p>
												<FieldInfo field={field} />
											</div>
										)}
									</form.Field>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="pb-4">
									<CardTitle className="text-base">表单设置</CardTitle>
									<CardDescription>配置表单的安全性和功能选项</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<form.Field name="disableCaptcha">
										{(field) => (
											<div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<Shield className="h-4 w-4 text-orange-600" />
														<Label className="font-medium">关闭reCAPTCHA</Label>
													</div>
													<p className="text-muted-foreground text-sm">
														关闭人机验证（可能增加垃圾邮件风险）
													</p>
												</div>
												<Switch
													checked={field.state.value}
													onCheckedChange={field.handleChange}
												/>
											</div>
										)}
									</form.Field>

									<form.Field name="enableFileUpload">
										{(field) => (
											<div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<Upload className="h-4 w-4 text-green-600" />
														<Label className="font-medium">启用文件上传</Label>
													</div>
													<p className="text-muted-foreground text-sm">
														允许用户通过表单上传文件附件
													</p>
												</div>
												<Switch
													checked={field.state.value}
													onCheckedChange={field.handleChange}
												/>
											</div>
										)}
									</form.Field>
								</CardContent>
							</Card>
						</CollapsibleContent>
					</Collapsible>

					{/* 代码预览 */}
					<form.Subscribe
						selector={(state) => ({
							alias: state.values.alias,
						})}
					>
						{({ alias }) =>
							alias ? (
								<Card>
									<CardHeader className="pb-4">
										<div className="flex items-center justify-between">
											<CardTitle className="flex items-center gap-2 text-base">
												<Code2 className="h-4 w-4 text-purple-600" />
												表单代码预览
											</CardTitle>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setShowPreview(!showPreview)}
											>
												{showPreview ? "隐藏代码" : "显示代码"}
											</Button>
										</div>
										<CardDescription>
											复制下面的HTML代码到您的网站中
										</CardDescription>
									</CardHeader>
									{showPreview && (
										<CardContent>
											<div className="relative w-full overflow-x-auto rounded-lg bg-slate-950 p-4">
												<pre className="whitespace-pre-wrap break-all text-slate-100 text-sm">
													<code>{generatePreview()}</code>
												</pre>
											</div>
										</CardContent>
									)}
								</Card>
							) : null
						}
					</form.Subscribe>

					<DialogFooter className="gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							取消
						</Button>
						<form.Subscribe
							selector={(state) => ({
								canSubmit: state.canSubmit,
								isSubmitting: state.isSubmitting,
							})}
						>
							{({ canSubmit, isSubmitting }) => (
								<Button
									type="submit"
									disabled={!canSubmit || isSubmitting}
									className="min-w-[100px]"
								>
									{isSubmitting && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{isEdit ? "更新配置" : "创建配置"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
