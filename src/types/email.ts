import { z } from "zod";

export const formDataSchema = z.object({
	email: z.string(),
	name: z.string(),
	message: z.string(),
	_country: z.string().optional(),
});

export type FormDataEmailPayload = z.infer<typeof formDataSchema>;
