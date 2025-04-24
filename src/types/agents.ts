export type Agent = {
	id: string;
	apiKey: string;
	name: string;
	prompt: string;
	model: string;
	kbIds: string[] | null;
	createdAt: Date | null;
	updatedAt: Date | null;
};
