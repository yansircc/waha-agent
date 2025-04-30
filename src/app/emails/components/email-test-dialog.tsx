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
import { useState } from "react";

interface EmailTestDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	formDataFormId: string;
}

export function EmailTestDialog({
	open,
	onOpenChange,
	formDataFormId,
}: EmailTestDialogProps) {
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [message, setMessage] = useState("");

	const embedCode = `<form action="https://api.form-data.com/f/${formDataFormId}"
  method="post"
  target="_blank">
  <div>
    <label for="email">Email</label>
    <input name="email" type="email" />
  </div>
  <div>
    <label for="name">Name</label>
    <input name="name" type="text" />
  </div>
  <div>
    <label for="message">Message</label>
    <textarea name="message" rows="4"></textarea>
  </div>
  <button type="submit">Submit</button>
</form>`;

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
							action={`https://api.form-data.com/f/${formDataFormId}`}
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
							<div className="rounded-md bg-muted p-4">
								<pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-sm">
									<code>{embedCode}</code>
								</pre>
							</div>
							<DialogFooter>
								<Button
									onClick={() => {
										navigator.clipboard.writeText(embedCode);
									}}
								>
									复制代码
								</Button>
							</DialogFooter>
						</div>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
