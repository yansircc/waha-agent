import { z } from "zod";

export const emailStepSchema = z.object({
	emailAddress: z.string().email("Please enter a valid email address"),
});

export const aliasStepSchema = z.object({
	alias: z.string().min(1, "Please enter the alias provided by formsubmit.co"),
});

export const plunkApiStepSchema = z.object({
	plunkApiKey: z.string().min(1, "Please enter your Plunk API key"),
});

export const wechatApiStepSchema = z.object({
	wechatPushApiKey: z.string().min(1, "Please enter your WeChat Push API key"),
});

export const freeEmailFormSchema = z.object({
	emailAddress: z.string().email("Please enter a valid email address"),
	alias: z.string().min(1, "Please enter the alias provided by formsubmit.co"),
	plunkApiKey: z.string().min(1, "Please enter your Plunk API key"),
	wechatPushApiKey: z.string().min(1, "Please enter your WeChat Push API key"),
	formSubmitActivated: z.boolean().default(false),
	setupCompleted: z.boolean().default(false),
});

export type EmailStepInput = z.infer<typeof emailStepSchema>;
export type AliasStepInput = z.infer<typeof aliasStepSchema>;
export type PlunkApiStepInput = z.infer<typeof plunkApiStepSchema>;
export type WechatApiStepInput = z.infer<typeof wechatApiStepSchema>;
export type FreeEmailFormInput = z.infer<typeof freeEmailFormSchema>;
