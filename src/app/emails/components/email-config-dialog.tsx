"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import * as z from "zod";

// Define the schema
const formSchema = z.object({
	id: z.string().optional(),
	signature: z.string().optional(),
	plunkApiKey: z.string().min(1, "请输入Plunk API 密钥"),
	wechatPushApiKey: z.string().min(1, "请输入Wechat push API 密钥"),
	formDataFormId: z.string().min(1, "请输入Form-Data 表单ID"),
	formDataWebhookSecret: z.string().min(1, "请输入Form-Data webhook secret"),
	agentId: z.string().min(1, "请选择AI Agent"),
});

// Define the type using zod inference
type FormValues = z.infer<typeof formSchema>;

interface EmailConfigDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: FormValues) => void;
	agents: Array<{ id: string; name: string }>;
	defaultValues?: Partial<FormValues>;
	mode: "create" | "edit";
}

export function EmailConfigDialog({
	open,
	onOpenChange,
	onSubmit,
	agents,
	defaultValues,
	mode,
}: EmailConfigDialogProps) {
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			signature: "",
			plunkApiKey: "",
			wechatPushApiKey: "",
			formDataFormId: "",
			formDataWebhookSecret: "",
			agentId: "",
			...defaultValues,
		},
	});

	const handleSubmit: SubmitHandler<FormValues> = (data) => {
		onSubmit(data);
		form.reset();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>
						{mode === "create" ? "创建新的邮件配置" : "编辑邮件配置"}
					</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-6"
					>
						<FormField
							control={form.control}
							name="agentId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>AI Agent</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="请选择AI Agent" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{agents.map((agent) => (
												<SelectItem key={agent.id} value={agent.id}>
													{agent.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormDescription>将生成邮件回复的AI Agent</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="plunkApiKey"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Plunk API Key</FormLabel>
										<FormControl>
											<Input
												placeholder="plunk_..."
												type="password"
												{...field}
											/>
										</FormControl>
										<FormDescription>用于Plunk邮件服务</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="wechatPushApiKey"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Wechat Push API Key</FormLabel>
										<FormControl>
											<Input placeholder="SCT2..." type="password" {...field} />
										</FormControl>
										<FormDescription>用于Wechat push服务</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="formDataFormId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Form-Data 表单ID</FormLabel>
										<FormControl>
											<Input placeholder="gf2..." {...field} />
										</FormControl>
										<FormDescription>
											表单ID来自你的Form-Data表单
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="formDataWebhookSecret"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Form-Data Webhook Secret</FormLabel>
										<FormControl>
											<Input placeholder="9cb..." type="password" {...field} />
										</FormControl>
										<FormDescription>用于webhook验证</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="signature"
							render={({ field }) => (
								<FormItem>
									<FormLabel>邮件签名 (HTML)</FormLabel>
									<FormControl>
										<Textarea
											placeholder="<p>Best regards,<br>Your Company Team</p>"
											className="min-h-[100px]"
											{...field}
											value={field.value || ""}
										/>
									</FormControl>
									<FormDescription>
										HTML签名，附加到邮件中，选填
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="submit">
								{mode === "create" ? "创建邮件配置" : "更新邮件配置"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
