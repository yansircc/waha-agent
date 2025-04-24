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
	plunkApiKey: z.string().min(1, "Plunk API key is required"),
	wechatPushApiKey: z.string().min(1, "Wechat push API key is required"),
	formDataFormId: z.string().min(1, "Form-Data form ID is required"),
	formDataWebhookSecret: z
		.string()
		.min(1, "Form-Data webhook secret is required"),
	agentId: z.string().min(1, "Agent ID is required"),
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
						{mode === "create"
							? "Create new email config"
							: "Edit email config"}
					</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-6"
					>
						<FormField
							control={form.control}
							name="signature"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email Signature (HTML)</FormLabel>
									<FormControl>
										<Textarea
											placeholder="<p>Best regards,<br>Your Company Team</p>"
											className="min-h-[100px]"
											{...field}
											value={field.value || ""}
										/>
									</FormControl>
									<FormDescription>
										Optional HTML signature to append to emails
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

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
												<SelectValue placeholder="Select an agent" />
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
									<FormDescription>
										The AI agent that will generate email responses
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="plunkApiKey"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Plunk API Key</FormLabel>
									<FormControl>
										<Input placeholder="plunk_..." type="password" {...field} />
									</FormControl>
									<FormDescription>
										API key for the Plunk email service
									</FormDescription>
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
										<Input
											placeholder="SCT218011TXuUKrk52rbczON8RCPHNiLaG"
											type="password"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										API key for the Wechat push service
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="formDataFormId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Form-Data Form ID</FormLabel>
										<FormControl>
											<Input placeholder="gf25yb51m5wa936sa8ak" {...field} />
										</FormControl>
										<FormDescription>
											ID from your Form-Data form
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
											<Input
												placeholder="9cb15j74e0b5zixcmb..."
												type="password"
												{...field}
											/>
										</FormControl>
										<FormDescription>
											Secret for webhook verification
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<DialogFooter>
							<Button type="submit">
								{mode === "create"
									? "Create email config"
									: "Update email config"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
