export interface Kb {
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
	content: string | null;
	fileUrl: string | null;
	filePath: string | null;
	fileType: string | null;
	fileSize: number | null;
	mimeType: string | null;
	isText: boolean | null;
	metadata: unknown;
	kbId: string;
	createdAt: string | Date;
	updatedAt: string | Date | null;
	vectorizationStatus?: string;
}

export interface CreateKbInput {
	name: string;
	description?: string;
	content?: string;
	userId: string;
}

export interface UpdateKbInput {
	id: string;
	name?: string;
	description?: string;
	userId: string;
}

export interface CreateDocumentInput {
	name: string;
	content?: string;
	file?: File;
	fileUrl?: string;
	filePath?: string;
	fileType?: string;
	fileSize?: number;
	mimeType?: string;
	isText?: boolean;
	metadata?: Record<string, unknown>;
	kbId: string;
	userId: string;
	preserveOriginal?: boolean;
}

export interface UpdateDocumentInput {
	id: string;
	name?: string;
	content?: string;
	file?: File;
	fileUrl?: string;
	filePath?: string;
	fileType?: string;
	fileSize?: number;
	mimeType?: string;
	isText?: boolean;
	metadata?: Record<string, unknown>;
	vectorizationStatus?: string;
	kbId: string;
	userId: string;
}
