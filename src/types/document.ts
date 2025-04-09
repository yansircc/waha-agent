export interface Document {
	id: string;
	name: string;
	kbId: string;
	content: string | null;
	fileType: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
	fileSize: number | null;
	vectorizationStatus: string;
	fileUrl?: string | null;
	mimeType?: string | null;
	filePath?: string | null;
}
