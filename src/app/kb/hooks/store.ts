import type { Document } from "@/types/document";
import type { Kb } from "@/types/kb";
import { create } from "zustand";

interface VectorizationRun {
	runId: string;
	token: string;
	documentId: string;
	kbId: string;
}

interface KbState {
	// Knowledge base states
	selectedKb: Kb | null;
	isAddKbOpen: boolean;

	// Document states
	isAddDocOpen: boolean;
	processingDocIds: Set<string>;
	deletingDocIds: Set<string>;
	documentToDelete: Document | null;
	uploadProgress: Record<string, number>;

	// Vectorization runs
	documentVectorizationRuns: Record<string, VectorizationRun>;

	// View state
	activeTab: "list" | "detail";

	// Actions
	setSelectedKb: (kb: Kb | null) => void;
	setIsAddKbOpen: (isOpen: boolean) => void;
	setIsAddDocOpen: (isOpen: boolean) => void;
	setActiveTab: (tab: "list" | "detail") => void;
	addProcessingDocId: (id: string) => void;
	removeProcessingDocId: (id: string) => void;
	addDeletingDocId: (id: string) => void;
	removeDeletingDocId: (id: string) => void;
	setDocumentToDelete: (doc: Document | null) => void;
	setUploadProgress: (fileName: string, progress: number) => void;
	resetUploadProgress: () => void;

	// Vectorization run management
	addVectorizationRun: (documentId: string, runInfo: VectorizationRun) => void;
	removeVectorizationRun: (documentId: string) => void;
}

export const useKbStore = create<KbState>((set) => ({
	// Initial states
	selectedKb: null,
	isAddKbOpen: false,
	isAddDocOpen: false,
	processingDocIds: new Set<string>(),
	deletingDocIds: new Set<string>(),
	documentToDelete: null,
	uploadProgress: {},
	documentVectorizationRuns: {},
	activeTab: "list",

	// Actions
	setSelectedKb: (kb) => set({ selectedKb: kb }),
	setIsAddKbOpen: (isOpen) => set({ isAddKbOpen: isOpen }),
	setIsAddDocOpen: (isOpen) => set({ isAddDocOpen: isOpen }),
	setActiveTab: (tab) => set({ activeTab: tab }),

	addProcessingDocId: (id) =>
		set((state) => {
			const newSet = new Set(state.processingDocIds);
			newSet.add(id);
			return { processingDocIds: newSet };
		}),

	removeProcessingDocId: (id) =>
		set((state) => {
			const newSet = new Set(state.processingDocIds);
			newSet.delete(id);
			return { processingDocIds: newSet };
		}),

	addDeletingDocId: (id) =>
		set((state) => {
			const newSet = new Set(state.deletingDocIds);
			newSet.add(id);
			return { deletingDocIds: newSet };
		}),

	removeDeletingDocId: (id) =>
		set((state) => {
			const newSet = new Set(state.deletingDocIds);
			newSet.delete(id);
			return { deletingDocIds: newSet };
		}),

	setDocumentToDelete: (doc) => set({ documentToDelete: doc }),

	setUploadProgress: (fileName, progress) =>
		set((state) => ({
			uploadProgress: {
				...state.uploadProgress,
				[fileName]: progress,
			},
		})),

	resetUploadProgress: () => set({ uploadProgress: {} }),

	// Vectorization runs management
	addVectorizationRun: (documentId, runInfo) =>
		set((state) => ({
			documentVectorizationRuns: {
				...state.documentVectorizationRuns,
				[documentId]: runInfo,
			},
		})),

	removeVectorizationRun: (documentId) =>
		set((state) => {
			const newRuns = { ...state.documentVectorizationRuns };
			delete newRuns[documentId];
			return { documentVectorizationRuns: newRuns };
		}),
}));

// Export documented vectorization runs for compatibility
export const documentVectorizationRuns: Record<string, VectorizationRun> = {};
