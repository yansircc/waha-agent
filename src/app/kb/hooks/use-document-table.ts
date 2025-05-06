"use client";

import type { Document } from "@/types/document";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDocumentVectorization } from "./use-document-vectorization";
import { documentVectorizationRuns } from "./use-documents";

interface UseDocumentTableProps {
	documents: Document[];
	onDelete: (id: string, kbId: string) => void | Promise<void>;
	onVectorize: (id: string) => void | Promise<void>;
}

interface UseDocumentTableReturn {
	localDocuments: Document[];
	processingDocIds: Set<string>;
	deletingDocIds: Set<string>;
	documentToDelete: Document | null;
	isProcessing: (document: Document) => boolean;
	isPending: (document: Document) => boolean;
	isFailed: (document: Document) => boolean;
	isCompleted: (document: Document) => boolean;
	isDeleting: (document: Document) => boolean;
	handleVectorize: (document: Document) => Promise<void>;
	confirmDelete: (document: Document) => void;
	executeDelete: (document: Document) => Promise<void>;
	cancelDelete: () => void;
	openFile: (fileUrl: string | null | undefined) => void;
	updateDocumentStatus: (documentId: string, isProcessing: boolean) => void;
}

export function useDocumentTable({
	documents,
	onDelete,
	onVectorize,
}: UseDocumentTableProps): UseDocumentTableReturn {
	const [processingDocIds, setProcessingDocIds] = useState<Set<string>>(
		new Set(),
	);
	const [deletingDocIds, setDeletingDocIds] = useState<Set<string>>(new Set());
	const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
		null,
	);

	// 创建一个Map存储正在处理的文档的状态
	const [processingStatuses, setProcessingStatuses] = useState<
		Map<string, boolean>
	>(new Map());

	// 监听文档向量化状态变化并更新本地状态
	const updateDocumentStatus = useCallback(
		(documentId: string, isProcessing: boolean) => {
			// 检查状态是否真的变化了
			const currentStatus = processingStatuses.get(documentId);
			if (currentStatus === isProcessing) {
				return; // 避免不必要的状态更新
			}

			setProcessingStatuses((prev) => {
				const newMap = new Map(prev);
				newMap.set(documentId, isProcessing);
				return newMap;
			});
		},
		[processingStatuses],
	);

	// 排序文档，按照创建日期降序排列（最新的在最上面）
	const sortDocumentsByDate = useCallback((docs: Document[]): Document[] => {
		return [...docs].sort((a, b) => {
			// 处理可能为空的日期
			const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
			const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
			return dateB.getTime() - dateA.getTime(); // 降序排列，最新的在最上面
		});
	}, []);

	const [localDocuments, setLocalDocuments] = useState<Document[]>(() =>
		sortDocumentsByDate(documents),
	);

	// 当props文档更新时，仅当真正有变化时才同步本地文档
	useEffect(() => {
		// 比较documents和localDocuments是否有实质性差异
		const needsUpdate =
			documents.length !== localDocuments.length ||
			documents.some((doc) => {
				const localDoc = localDocuments.find((local) => local.id === doc.id);
				return (
					!localDoc || localDoc.vectorizationStatus !== doc.vectorizationStatus
				);
			});

		if (needsUpdate) {
			setLocalDocuments(sortDocumentsByDate(documents));
		}
	}, [documents, localDocuments, sortDocumentsByDate]);

	// 处理向量化请求
	const handleVectorize = async (document: Document) => {
		// 如果已经在处理中，不重复添加
		if (isProcessing(document)) {
			return;
		}

		// 更新处理中状态
		setProcessingDocIds((prev) => {
			const newSet = new Set(prev);
			newSet.add(document.id);
			return newSet;
		});

		// 更新本地状态为处理中
		updateDocumentStatus(document.id, true);

		try {
			await onVectorize(document.id);

			// 更新本地状态为处理中
			setLocalDocuments((prevDocs) =>
				prevDocs.map((doc) =>
					doc.id === document.id
						? { ...doc, vectorizationStatus: "processing" }
						: doc,
				),
			);
		} catch (error) {
			toast.error("向量化请求失败，请稍后再试");

			// 从处理中状态移除
			setProcessingDocIds((prev) => {
				const newSet = new Set(prev);
				newSet.delete(document.id);
				return newSet;
			});

			// 更新本地状态为非处理中
			updateDocumentStatus(document.id, false);
		}
	};

	// 打开文件
	const openFile = (fileUrl: string | null | undefined) => {
		if (fileUrl) {
			window.open(fileUrl, "_blank");
		} else {
			toast.error("文件链接不可用");
		}
	};

	// 打开删除确认对话框
	const confirmDelete = (document: Document) => {
		setDocumentToDelete(document);
	};

	// 处理文档删除
	const executeDelete = async (document: Document) => {
		if (!document.kbId) return;

		setDeletingDocIds((prev) => {
			const newSet = new Set(prev);
			newSet.add(document.id);
			return newSet;
		});

		try {
			await onDelete(document.id, document.kbId);
			// 父组件将处理从列表中移除此文档
		} catch (error) {
			setDeletingDocIds((prev) => {
				const newSet = new Set(prev);
				newSet.delete(document.id);
				return newSet;
			});
			toast.error("删除文档失败");
		} finally {
			setDocumentToDelete(null);
		}
	};

	// 取消文档删除
	const cancelDelete = () => {
		setDocumentToDelete(null);
	};

	// 检查文档是否正在处理 - 使用Trigger.dev运行状态
	const isProcessing = (document: Document) => {
		// 首先检查我们的本地状态
		if (processingDocIds.has(document.id)) {
			return true;
		}

		// 检查文档状态
		if (document.vectorizationStatus === "processing") {
			return true;
		}

		// 检查我们的processingStatuses Map
		if (processingStatuses.has(document.id)) {
			return processingStatuses.get(document.id) === true;
		}

		// 检查是否有Trigger.dev任务运行
		const runInfo = documentVectorizationRuns[document.id];
		// 如果有运行信息但尚未设置状态，则假设正在处理中
		return !!runInfo;
	};

	// 检查文档是否处于待处理状态
	const isPending = (document: Document) => {
		return (
			document.vectorizationStatus === "pending" ||
			!document.vectorizationStatus
		);
	};

	// 检查文档向量化是否失败
	const isFailed = (document: Document) => {
		return document.vectorizationStatus === "failed";
	};

	// 检查文档向量化是否完成
	const isCompleted = (document: Document) => {
		return (
			document.vectorizationStatus === "vectorized" ||
			document.vectorizationStatus === "completed"
		);
	};

	// 检查文档是否正在删除
	const isDeleting = (document: Document) => {
		return deletingDocIds.has(document.id);
	};

	// 当文档状态变为已完成或失败时，从处理队列中移除
	useEffect(() => {
		const completedOrFailedIds = localDocuments
			.filter(
				(doc) =>
					doc.vectorizationStatus === "vectorized" ||
					doc.vectorizationStatus === "completed" ||
					doc.vectorizationStatus === "failed",
			)
			.map((doc) => doc.id);

		// 检查是否有需要从处理队列中移除的ID
		let needsUpdate = false;
		const newProcessingIds = new Set(processingDocIds);

		for (const id of completedOrFailedIds) {
			if (processingDocIds.has(id)) {
				newProcessingIds.delete(id);
				needsUpdate = true;
			}
		}

		// 只在真正有变化时才更新状态
		if (needsUpdate) {
			setProcessingDocIds(newProcessingIds);
		}
	}, [localDocuments, processingDocIds]);

	// 确保返回的localDocuments总是按日期排序
	const sortedLocalDocuments = useMemo(() => {
		return sortDocumentsByDate(localDocuments);
	}, [localDocuments, sortDocumentsByDate]);

	return {
		localDocuments: sortedLocalDocuments,
		processingDocIds,
		deletingDocIds,
		documentToDelete,
		isProcessing,
		isPending,
		isFailed,
		isCompleted,
		isDeleting,
		handleVectorize,
		confirmDelete,
		executeDelete,
		cancelDelete,
		openFile,
		updateDocumentStatus,
	};
}
