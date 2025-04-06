export type Agent = {
	id: string;
	name: string;
	prompt: string;
	isActive: boolean;
	knowledgeBaseIds: string[] | null;
	createdAt: Date | null;
	updatedAt: Date | null;
};
