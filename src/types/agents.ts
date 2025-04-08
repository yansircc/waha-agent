export type Agent = {
	id: string;
	name: string;
	prompt: string;
	isActive: boolean;
	kbIds: string[] | null;
	createdAt: Date | null;
	updatedAt: Date | null;
};
