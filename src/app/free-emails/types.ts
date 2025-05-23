import { z } from "zod";

export const freeEmailFormSchema = z.object({
	// 主要字段
	email: z.string().email("请输入有效的邮箱地址"),
	alias: z.string().min(1, "请输入FormSubmit.co的别名"),
	plunkApiKey: z.string().min(1, "请输入Plunk API key"),
	agentId: z.string().min(1, "请选择AI Agent"),

	// FormSubmit 高级选项
	wechatPushApiKey: z.union([z.string(), z.literal("")]),
	ccEmails: z.union([z.string().min(1, "请输入有效的邮箱地址"), z.literal("")]),
	redirectUrl: z.union([z.string().url("请输入有效的URL"), z.literal("")]),
	disableCaptcha: z.boolean(), // 是否关闭reCAPTCHA
	enableFileUpload: z.boolean(), // 是否启用文件上传
	customWebhooks: z.union([
		z.string().min(1, "请输入有效的URL"),
		z.literal(""),
	]),
});

export type FreeEmailFormInput = z.infer<typeof freeEmailFormSchema>;
