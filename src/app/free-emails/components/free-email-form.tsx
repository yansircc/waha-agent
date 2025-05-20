"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	CheckCircle,
	CircleHelp,
	Info,
	Loader2,
	Mail,
	RefreshCcw,
	SendIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useFreeEmails } from "../hooks/use-free-emails";
import { freeEmailApiService } from "../services/free-email-api";
import {
	type AliasStepInput,
	type EmailStepInput,
	type FreeEmailFormInput,
	type PlunkApiStepInput,
	type WechatApiStepInput,
	aliasStepSchema,
	emailStepSchema,
	plunkApiStepSchema,
	wechatApiStepSchema,
} from "../types";

interface FreeEmailFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onComplete: () => void;
	existingData?: Partial<FreeEmailFormInput>;
}

type FormStep = "email" | "alias" | "plunk" | "wechat" | "complete";

export function FreeEmailForm({
	open,
	onOpenChange,
	onComplete,
	existingData = {},
}: FreeEmailFormProps) {
	const [currentStep, setCurrentStep] = useState<FormStep>("email");
	const [formData, setFormData] =
		useState<Partial<FreeEmailFormInput>>(existingData);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [returnUrl, setReturnUrl] = useState("");
	const [isResumingForm, setIsResumingForm] = useState(false);
	const [resumeStepName, setResumeStepName] = useState<string>("");

	const {
		formState: savedFormState,
		isFormStateLoaded,
		saveFormState,
		clearFormState,
		createFreeEmail,
	} = useFreeEmails();

	// 设置返回URL
	useEffect(() => {
		if (typeof window !== "undefined") {
			setReturnUrl(window.location.href);
		}
	}, []);

	// Load existing form data from savedFormState if available
	useEffect(() => {
		if (open && isFormStateLoaded && savedFormState) {
			const emailInState = savedFormState.emailAddress as string;

			if (emailInState) {
				let resumeStep: FormStep = "email";
				let stepName = "";

				// Determine which step to show based on saved data
				if (emailInState && !savedFormState.alias) {
					resumeStep = "alias";
					stepName = "获取FormSubmit别名";
				} else if (savedFormState.alias && !savedFormState.plunkApiKey) {
					resumeStep = "plunk";
					stepName = "配置Plunk API";
				} else if (
					savedFormState.plunkApiKey &&
					!savedFormState.wechatPushApiKey
				) {
					resumeStep = "wechat";
					stepName = "设置微信推送";
				} else if (
					emailInState &&
					savedFormState.alias &&
					savedFormState.plunkApiKey &&
					savedFormState.wechatPushApiKey
				) {
					resumeStep = "complete";
					stepName = "完成设置";
				}

				if (resumeStep !== "email") {
					setIsResumingForm(true);
					setResumeStepName(stepName);
					setFormData((prevData) => ({ ...prevData, ...savedFormState }));
					setCurrentStep(resumeStep);
				}
			}
		}
	}, [open, isFormStateLoaded, savedFormState]);

	// 重置表单状态，从头开始
	const handleResetForm = async () => {
		try {
			setIsResumingForm(false);
			setResumeStepName("");
			setCurrentStep("email");
			setFormData({});
			await clearFormState();
			toast.success("表单已重置，您可以重新开始");
		} catch (error) {
			console.error("Error resetting form:", error);
			toast.error("表单重置失败，请重试");
		}
	};

	// Form setup for each step
	const emailForm = useForm<EmailStepInput>({
		resolver: zodResolver(emailStepSchema),
		defaultValues: {
			emailAddress: formData.emailAddress || "",
		},
	});

	const aliasForm = useForm<AliasStepInput>({
		resolver: zodResolver(aliasStepSchema),
		defaultValues: {
			alias: formData.alias || "",
		},
	});

	const plunkForm = useForm<PlunkApiStepInput>({
		resolver: zodResolver(plunkApiStepSchema),
		defaultValues: {
			plunkApiKey: formData.plunkApiKey || "",
		},
	});

	const wechatForm = useForm<WechatApiStepInput>({
		resolver: zodResolver(wechatApiStepSchema),
		defaultValues: {
			wechatPushApiKey: formData.wechatPushApiKey || "",
		},
	});

	// Update form values when formData changes
	useEffect(() => {
		emailForm.reset({ emailAddress: formData.emailAddress || "" });
		aliasForm.reset({ alias: formData.alias || "" });
		plunkForm.reset({ plunkApiKey: formData.plunkApiKey || "" });
		wechatForm.reset({ wechatPushApiKey: formData.wechatPushApiKey || "" });
	}, [formData, emailForm, aliasForm, plunkForm, wechatForm]);

	// Handle form submissions for each step
	const handleEmailSubmit = async (data: EmailStepInput) => {
		setIsSubmitting(true);
		try {
			// Save the email to Redis
			await saveFormState({
				emailAddress: data.emailAddress,
			});

			// Update local form data
			setFormData((prev) => ({ ...prev, ...data }));

			// 直接提交表单到FormSubmit
			const formAction = `https://formsubmit.co/${data.emailAddress}`;

			// 创建并提交表单
			const form = document.createElement("form");
			form.method = "POST";
			form.action = formAction;
			form.target = "_blank";

			// 添加隐藏字段
			const nameField = document.createElement("input");
			nameField.type = "hidden";
			nameField.name = "name";
			nameField.value = "Waha";

			const emailField = document.createElement("input");
			emailField.type = "hidden";
			emailField.name = "email";
			emailField.value = data.emailAddress;

			const messageField = document.createElement("input");
			messageField.type = "hidden";
			messageField.name = "message";
			messageField.value = "Register";

			const captchaField = document.createElement("input");
			captchaField.type = "hidden";
			captchaField.name = "_captcha";
			captchaField.value = "false";

			const nextField = document.createElement("input");
			nextField.type = "hidden";
			nextField.name = "_next";
			nextField.value = returnUrl;

			// 添加字段到表单
			form.appendChild(nameField);
			form.appendChild(emailField);
			form.appendChild(messageField);
			form.appendChild(captchaField);
			form.appendChild(nextField);

			// 添加表单到body，提交后移除
			document.body.appendChild(form);
			form.submit();
			document.body.removeChild(form);

			// 直接跳转到别名输入步骤
			setCurrentStep("alias");
			toast.success("表单已提交！请检查您的邮箱查收确认邮件，并获取别名");
		} catch (error) {
			console.error("Error submitting email form:", error);
			toast.error("邮箱保存失败，请重试");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleAliasSubmit = async (data: AliasStepInput) => {
		setIsSubmitting(true);
		try {
			if (!formData.emailAddress) {
				throw new Error("缺少邮箱地址");
			}

			// Validate the alias
			const isValid = await freeEmailApiService.validateAlias(
				formData.emailAddress,
				data.alias,
			);

			if (!isValid) {
				toast.error("别名验证失败，请确认是否正确");
				setIsSubmitting(false);
				return;
			}

			// Save the alias to Redis via tRPC
			await saveFormState({
				alias: data.alias,
				formSubmitActivated: true,
			});

			// Update local form data
			setFormData((prev) => ({
				...prev,
				...data,
				formSubmitActivated: true,
			}));

			// Move to next step
			setCurrentStep("plunk");
			toast.success("别名已验证保存");
		} catch (error) {
			console.error("Error validating alias:", error);
			toast.error("别名验证失败，请重试");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePlunkSubmit = async (data: PlunkApiStepInput) => {
		setIsSubmitting(true);
		try {
			// Validate Plunk API key
			const isValid = await freeEmailApiService.validatePlunkApiKey(
				data.plunkApiKey,
			);

			if (!isValid) {
				toast.error("Plunk API密钥验证失败，请检查格式是否正确");
				setIsSubmitting(false);
				return;
			}

			// Save the Plunk API key to Redis via tRPC
			await saveFormState({
				plunkApiKey: data.plunkApiKey,
			});

			// Update local form data
			setFormData((prev) => ({ ...prev, ...data }));

			// Move to next step
			setCurrentStep("wechat");
			toast.success("Plunk API密钥已保存");
		} catch (error) {
			console.error("Error validating Plunk API key:", error);
			toast.error("Plunk API密钥保存失败，请重试");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleWechatSubmit = async (data: WechatApiStepInput) => {
		setIsSubmitting(true);
		try {
			// Validate WeChat Push API key
			const isValid = await freeEmailApiService.validateWechatPushApiKey(
				data.wechatPushApiKey,
			);

			if (!isValid) {
				toast.error("微信推送API密钥验证失败，请检查格式是否正确");
				setIsSubmitting(false);
				return;
			}

			// Save the WeChat Push API key to Redis and mark setup as complete
			await saveFormState({
				wechatPushApiKey: data.wechatPushApiKey,
				setupCompleted: true,
			});

			// Update local form data
			setFormData((prev) => ({
				...prev,
				...data,
				setupCompleted: true,
			}));

			// Move to completion step
			setCurrentStep("complete");

			// Save the complete form data to the backend
			if (formData.emailAddress && formData.alias) {
				await createFreeEmail({
					emailAddress: formData.emailAddress,
					alias: formData.alias,
					plunkApiKey: formData.plunkApiKey || "",
					wechatPushApiKey: data.wechatPushApiKey,
					formSubmitActivated: true,
					setupCompleted: true,
				});

				// Clear form state from Redis on successful completion
				await clearFormState();
			}

			toast.success("设置完成！您的免费邮件服务已配置好");
		} catch (error) {
			console.error("Error completing setup:", error);
			toast.error("设置完成失败，请重试");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleComplete = () => {
		// Close dialog and notify parent
		onOpenChange(false);
		onComplete();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{currentStep === "email" && "第1步: 输入您的邮箱地址"}
						{currentStep === "alias" && "第2步: 输入FormSubmit别名"}
						{currentStep === "plunk" && "第3步: 设置Plunk API"}
						{currentStep === "wechat" && "第4步: 设置微信推送"}
						{currentStep === "complete" && "设置完成"}
					</DialogTitle>
					<DialogDescription>
						{currentStep === "email" &&
							"我们将使用您的邮箱来注册FormSubmit账户，并接收邮件通知"}
						{currentStep === "alias" && "输入FormSubmit确认邮件中提供的别名"}
						{currentStep === "plunk" && "输入Plunk API密钥，用于邮件自动回复"}
						{currentStep === "wechat" &&
							"输入微信推送API密钥，用于接收微信通知"}
						{currentStep === "complete" &&
							"您的免费邮件服务已配置完成，可以使用了！"}
					</DialogDescription>
				</DialogHeader>

				{/* 继续未完成表单的提示 */}
				{isResumingForm && currentStep !== "complete" && (
					<Alert className="my-2 border-blue-200 bg-blue-50">
						<Info className="h-4 w-4 text-blue-500" />
						<AlertTitle className="text-blue-700">继续未完成的设置</AlertTitle>
						<AlertDescription className="text-blue-600">
							<p className="mb-2 text-sm">
								您正在继续之前未完成的邮件服务设置（{formData.emailAddress}）
							</p>
							<p className="font-medium text-sm">当前步骤：{resumeStepName}</p>
							<div className="mt-2">
								<Button
									variant="outline"
									size="sm"
									className="border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200"
									onClick={handleResetForm}
								>
									<RefreshCcw className="mr-1 h-3 w-3" />
									重新开始设置
								</Button>
							</div>
						</AlertDescription>
					</Alert>
				)}

				{currentStep === "email" && (
					<Form {...emailForm}>
						<form
							onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
							className="space-y-4"
						>
							<FormField
								control={emailForm.control}
								name="emailAddress"
								render={({ field }) => (
									<FormItem>
										<FormLabel>邮箱地址</FormLabel>
										<FormControl>
											<Input placeholder="your@email.com" {...field} />
										</FormControl>
										<FormDescription>
											我们将向此邮箱发送确认邮件，其中包含设置说明
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<DialogFooter>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									<SendIcon className="mr-2 h-4 w-4" />
									提交并发送验证邮件
								</Button>
							</DialogFooter>
						</form>
					</Form>
				)}

				{currentStep === "alias" && (
					<Form {...aliasForm}>
						<form
							onSubmit={aliasForm.handleSubmit(handleAliasSubmit)}
							className="space-y-4"
						>
							<div className="mb-4 rounded-md bg-blue-50 p-4">
								<div className="flex">
									<div className="flex-shrink-0">
										<CircleHelp className="h-5 w-5 text-blue-400" />
									</div>
									<div className="ml-3">
										<p className="text-blue-700 text-sm">
											请检查您的邮箱 <strong>{formData.emailAddress}</strong>
											，查找FormSubmit发送的确认邮件。
											点击邮件中的确认链接后，您将收到别名。
											复制该别名并粘贴到下方。
										</p>
									</div>
								</div>
							</div>

							<FormField
								control={aliasForm.control}
								name="alias"
								render={({ field }) => (
									<FormItem>
										<FormLabel>FormSubmit别名</FormLabel>
										<FormControl>
											<Input placeholder="your-formsubmit-alias" {...field} />
										</FormControl>
										<FormDescription>
											FormSubmit提供的唯一标识符
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<DialogFooter className="flex items-center justify-between space-x-2">
								{isResumingForm && (
									<Button
										type="button"
										variant="ghost"
										onClick={handleResetForm}
										className="text-muted-foreground"
										size="sm"
									>
										<RefreshCcw className="mr-1 h-3 w-3" />
										重新开始
									</Button>
								)}
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									继续
								</Button>
							</DialogFooter>
						</form>
					</Form>
				)}

				{currentStep === "plunk" && (
					<Form {...plunkForm}>
						<form
							onSubmit={plunkForm.handleSubmit(handlePlunkSubmit)}
							className="space-y-4"
						>
							<FormField
								control={plunkForm.control}
								name="plunkApiKey"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Plunk API密钥</FormLabel>
										<FormControl>
											<Input
												placeholder="plunk_..."
												type="password"
												{...field}
											/>
										</FormControl>
										<FormDescription>
											用于自动邮件回复。从plunk.io获取密钥
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<DialogFooter className="flex items-center justify-between space-x-2">
								{isResumingForm && (
									<Button
										type="button"
										variant="ghost"
										onClick={handleResetForm}
										className="text-muted-foreground"
										size="sm"
									>
										<RefreshCcw className="mr-1 h-3 w-3" />
										重新开始
									</Button>
								)}
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									继续
								</Button>
							</DialogFooter>
						</form>
					</Form>
				)}

				{currentStep === "wechat" && (
					<Form {...wechatForm}>
						<form
							onSubmit={wechatForm.handleSubmit(handleWechatSubmit)}
							className="space-y-4"
						>
							<FormField
								control={wechatForm.control}
								name="wechatPushApiKey"
								render={({ field }) => (
									<FormItem>
										<FormLabel>微信推送API密钥</FormLabel>
										<FormControl>
											<Input placeholder="SCT..." type="password" {...field} />
										</FormControl>
										<FormDescription>
											用于收到邮件时发送微信通知
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<DialogFooter className="flex items-center justify-between space-x-2">
								{isResumingForm && (
									<Button
										type="button"
										variant="ghost"
										onClick={handleResetForm}
										className="text-muted-foreground"
										size="sm"
									>
										<RefreshCcw className="mr-1 h-3 w-3" />
										重新开始
									</Button>
								)}
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									完成设置
								</Button>
							</DialogFooter>
						</form>
					</Form>
				)}

				{currentStep === "complete" && (
					<div className="flex flex-col items-center justify-center space-y-4 py-6">
						<CheckCircle className="h-16 w-16 text-green-500" />
						<p className="text-center">
							您的免费邮件服务已设置完成，可以使用了！
						</p>
						<div className="flex w-full flex-col gap-2 pt-4">
							<div className="flex justify-between">
								<span className="font-medium text-sm">邮箱:</span>
								<span className="text-sm">{formData.emailAddress}</span>
							</div>
							<div className="flex justify-between">
								<span className="font-medium text-sm">别名:</span>
								<span className="text-sm">{formData.alias}</span>
							</div>
						</div>
						<DialogFooter className="w-full pt-4">
							<Button onClick={handleComplete}>
								<Mail className="mr-2 h-4 w-4" />
								开始使用您的邮件服务
							</Button>
						</DialogFooter>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
