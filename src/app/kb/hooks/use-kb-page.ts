"use client";

import { QDRANT_COLLECTION_NAME } from "@/lib/constants";
import type { BulkCrawlResult } from "@/trigger/bulk-crawl";
import type { Kb } from "@/types/kb";
import { useState } from "react";
import { useDocuments } from "./use-documents";
import { useKbs } from "./use-kbs";

/**
 * 知识库页面逻辑Hook
 * 封装了知识库页面所需的全部状态和操作
 */
export function useKbPage() {
	// Knowledge base state
	const [isAddKbOpen, setIsAddKbOpen] = useState(false);
	const [selectedKb, setSelectedKb] = useState<Kb | null>(null);

	// Document state
	const [isAddDocOpen, setIsAddDocOpen] = useState(false);

	// 向量化状态 - 不需要这些状态，因为我们使用useRealtimeRun钩子
	// 但保留变量名，以避免破坏现有组件的接口
	const isVectorizing = false;
	const vectorizingDocId = null;

	// View state
	const [tab, setTab] = useState<"list" | "detail">("list");

	// Hooks
	const { kbs, isLoadingKbs, createKb, deleteKb } = useKbs();
	const {
		createDocument,
		createDocuments,
		deleteDocument,
		getDocumentsByKbId,
		vectorizeDocument,
		vectorizeDocuments,
		createDocumentFromCrawl,
	} = useDocuments();

	// 获取选中知识库的文档
	const docsQuery = getDocumentsByKbId(selectedKb?.id);
	const documents = docsQuery.data || [];
	const isLoadingDocuments = docsQuery.isLoading || false;

	// Knowledge base handlers
	const handleOpenAddKbDialog = () => setIsAddKbOpen(true);

	const handleSubmitKb = async (data: {
		name: string;
		description: string;
	}) => {
		await createKb({
			name: data.name,
			description: data.description,
			content: "", // Empty content, managed through documents
		});
	};

	const handleDeleteKb = async (id: string) => {
		if (confirm("确定要删除这个知识库吗？")) {
			await deleteKb(id);
			if (selectedKb?.id === id) {
				setSelectedKb(null);
				setTab("list");
			}
		}
	};

	// Document handlers
	const handleOpenAddDocDialog = () => setIsAddDocOpen(true);
	const handleCloseAddDocDialog = () => setIsAddDocOpen(false);

	const handleSubmitDoc = async (files: File[]) => {
		if (!selectedKb || files.length === 0) return;

		// 使用多文件上传
		const result = await createDocuments({
			kbId: selectedKb.id,
			files,
		});

		// 可选显示上传结果摘要
		if (result.failed.length > 0) {
			console.warn(`${result.failed.length} 个文件上传失败`, result.failed);
		}

		// 自动向量化文档（需要确认）
		if (result.created.length > 0) {
			const shouldVectorize = confirm(
				`已上传 ${result.created.length} 个文档。是否立即向量化这些文档？`,
			);

			if (shouldVectorize) {
				const documentIds = result.created.map((doc) => doc.id);
				await vectorizeDocuments({
					kbId: selectedKb.id,
					documentIds,
					collectionName: QDRANT_COLLECTION_NAME,
				});
			}
		}
	};

	const handleDeleteDocument = async (id: string, kbId: string) => {
		// 不再使用浏览器自带的confirm，直接删除
		// UI层的AlertDialog会处理确认流程
		await deleteDocument(id, kbId);
	};

	const handleVectorizeDocument = async (documentId: string) => {
		if (!selectedKb) return;

		try {
			// 触发文档向量化
			await vectorizeDocument({
				kbId: selectedKb.id,
				documentId,
				collectionName: QDRANT_COLLECTION_NAME,
				url: "",
			});

			// 不需要设置状态，因为我们现在使用Trigger.dev的状态跟踪

			// 重新加载文档列表，以获取更新的状态
			await docsQuery.refetch();
		} catch (error) {
			console.error("向量化文档失败:", error);
			alert("向量化文档失败，请重试");
		}
	};

	const handleSelectKb = (kb: Kb) => {
		setSelectedKb(kb);
		setTab("detail");
	};

	const handleBackToList = () => {
		setSelectedKb(null);
		setTab("list");
	};

	const handleDocumentsCrawled = async (
		documentIds: string[],
		crawlOutput?: BulkCrawlResult,
	) => {
		// 如果提供了爬取任务的输出，需要先创建文档
		if (selectedKb && crawlOutput) {
			try {
				if (crawlOutput.fileUrl && crawlOutput.filePath) {
					// 从爬取结果创建文档
					await createDocumentFromCrawl({
						kbId: selectedKb.id,
						fileUrl: crawlOutput.fileUrl,
						filePath: crawlOutput.filePath,
						fileName: `共计${crawlOutput.totalCount}个网页 - ${formatTimestamp(new Date().getTime())}`,
						fileSize: crawlOutput.fileSize || 0, // 使用爬取任务返回的文件大小
						fileType: "text/markdown",
					});
				}
			} catch (err) {
				console.error("创建爬取文档失败:", err);
			}
		}

		// 重新获取当前选中知识库的文档
		if (selectedKb) {
			await docsQuery.refetch();
		}
	};

	return {
		// 状态
		tab,
		selectedKb,
		isAddKbOpen,
		isAddDocOpen,
		kbs,
		isLoadingKbs,
		documents,
		isLoadingDocuments,
		isVectorizing,
		vectorizingDocId,

		// Dialog 控制函数
		setIsAddKbOpen,
		setIsAddDocOpen,

		// 处理函数
		handleOpenAddKbDialog,
		handleSubmitKb,
		handleDeleteKb,
		handleOpenAddDocDialog,
		handleCloseAddDocDialog,
		handleSubmitDoc,
		handleDeleteDocument,
		handleVectorizeDocument,
		handleSelectKb,
		handleBackToList,
		handleDocumentsCrawled,
	};
}

function formatTimestamp(timestamp: number) {
	const date = new Date(timestamp);
	return date
		.toLocaleString("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		})
		.replace(/\//g, "-");
}
