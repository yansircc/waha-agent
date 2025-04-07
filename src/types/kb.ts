export interface KnowledgeBase {
	id: string;
	name: string;
	description: string | null;
	content: string;
	fileUrl: string | null;
	fileType: string | null;
	metadata: unknown;
	createdById: string;
	createdAt: string | Date;
	updatedAt: string | Date | null;
	documents?: Document[];
}

export interface Document {
	id: string;
	name: string;
	content: string;
	fileUrl: string | null;
	fileType: string | null;
	fileSize: number | null;
	metadata: unknown;
	knowledgeBaseId: string;
	createdAt: string | Date;
	updatedAt: string | Date | null;
}

export interface CreateKnowledgeBaseInput {
	name: string;
	description?: string;
	content?: string;
	userId: string;
}

export interface UpdateKnowledgeBaseInput {
	id: string;
	name?: string;
	description?: string;
	userId: string;
}

export interface CreateDocumentInput {
	name: string;
	content: string;
	fileUrl?: string;
	fileType?: string;
	fileSize?: number;
	metadata?: Record<string, unknown>;
	knowledgeBaseId: string;
	userId: string;
}

export interface UpdateDocumentInput {
	id: string;
	name?: string;
	content?: string;
	fileUrl?: string;
	fileType?: string;
	fileSize?: number;
	metadata?: Record<string, unknown>;
	knowledgeBaseId: string;
	userId: string;
}
