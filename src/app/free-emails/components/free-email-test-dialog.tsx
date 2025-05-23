"use client";

import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { env } from "@/env";
import { useState } from "react";
import { freeEmailApiService } from "../services/free-email-api";
import type { FreeEmailFormInput } from "../types";

interface FreeEmailTestDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	emailConfig: FreeEmailFormInput & { id: string; createdAt?: Date | null };
}

export function FreeEmailTestDialog({
	open,
	onOpenChange,
	emailConfig,
}: FreeEmailTestDialogProps) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");

	const formAction = `https://formsubmit.co/${emailConfig.alias}`;

	// Generate the embed code using the service
	const embedCode = freeEmailApiService.generateFormCode(
		emailConfig,
		env.NEXT_PUBLIC_APP_URL,
	);

	const handleCopyCode = () => {
		navigator.clipboard.writeText(embedCode);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>测试邮件发送</DialogTitle>
					<DialogDescription>
						填写以下表单来测试邮件发送功能，或查看嵌入代码
					</DialogDescription>
				</DialogHeader>

				<Tabs defaultValue="test">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="test">测试表单</TabsTrigger>
						<TabsTrigger value="code">嵌入代码</TabsTrigger>
					</TabsList>

					<TabsContent value="test">
						<form
							action={formAction}
							method="post"
							target="_blank"
							className="space-y-4 py-4"
						>
							<div className="space-y-2">
								<Label htmlFor="email">邮箱</Label>
								<Input
									id="email"
									name="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="name">姓名</Label>
								<Input
									id="name"
									name="name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="message">消息内容</Label>
								<Textarea
									id="message"
									name="message"
									rows={4}
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									required
								/>
							</div>

							{emailConfig.enableFileUpload && (
								<div className="space-y-2">
									<Label htmlFor="attachment">附件</Label>
									<Input
										id="attachment"
										name="attachment"
										type="file"
										accept="image/png, image/jpeg, .pdf, .doc, .docx"
									/>
								</div>
							)}

							{/* Hidden fields */}
							<input
								type="hidden"
								name="_webhook"
								value={`${env.NEXT_PUBLIC_APP_URL}/api/webhooks/email/${emailConfig.alias}`}
							/>

							{emailConfig.customWebhooks && (
								<input
									type="hidden"
									name="_custom_webhooks"
									value={emailConfig.customWebhooks}
								/>
							)}

							{emailConfig.ccEmails && (
								<input
									type="hidden"
									name="_cc"
									value={emailConfig.ccEmails.split(",").join(",")}
								/>
							)}

							{emailConfig.redirectUrl && (
								<input
									type="hidden"
									name="_next"
									value={emailConfig.redirectUrl}
								/>
							)}

							{emailConfig.disableCaptcha && (
								<input type="hidden" name="_captcha" value="false" />
							)}

							<input type="hidden" name="_replyto" />
							<input type="hidden" name="_template" value="table" />
							<input type="text" name="_honey" style={{ display: "none" }} />

							<DialogFooter>
								<Button type="submit">发送测试邮件</Button>
							</DialogFooter>
						</form>
					</TabsContent>

					<TabsContent value="code">
						<div className="space-y-4 py-4">
							<p className="text-muted-foreground text-sm">
								将以下代码添加到您的网站，以便用户可以直接发送邮件到您的邮箱:
							</p>
							<div className="relative max-h-[300px] w-full overflow-x-auto overflow-y-auto rounded-md bg-muted p-4">
								<pre className="whitespace-pre-wrap break-all text-sm">
									<code>{embedCode}</code>
								</pre>
							</div>
							<DialogFooter>
								<Button onClick={handleCopyCode}>复制代码</Button>
							</DialogFooter>
						</div>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
