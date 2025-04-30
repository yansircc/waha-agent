"use client";

import { QDRANT_COLLECTION_NAME } from "@/lib/constants";
import type { Kb } from "@/types/kb";
import { useEffect, useState } from "react";
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
	const [isWebCrawlerOpen, setIsWebCrawlerOpen] = useState(false);

	// 向量化状态
	const [isVectorizing, setIsVectorizing] = useState(false);
	const [vectorizingDocId, setVectorizingDocId] = useState<string | null>(null);

	// 新增状态：爬取完成的触发器
	const [sitemapCrawlComplete, setSitemapCrawlComplete] = useState(false);
	const [sitemapCrawlMessage, setSitemapCrawlMessage] = useState("");

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
	} = useDocuments();

	// 获取选中知识库的文档 - 在组件顶层调用Hook
	const docsQuery = getDocumentsByKbId(selectedKb?.id);
	const documents = docsQuery.data || [];
	const isLoadingDocuments = docsQuery.isLoading || false;

	// 处理Sitemap爬取完成后的逻辑 - 通过useEffect处理
	useEffect(() => {
		if (sitemapCrawlComplete && selectedKb && sitemapCrawlMessage) {
			// 保存一个消息副本，因为我们将立即重置原状态
			const message = sitemapCrawlMessage;

			// 立即重置状态，防止useEffect再次触发
			setSitemapCrawlComplete(false);
			setSitemapCrawlMessage("");

			const handleSitemapComplete = async () => {
				// 刷新文档列表获取最新状态
				await docsQuery.refetch();

				// 显示向量化提示，使用保存的消息副本
				const shouldVectorize = confirm(
					`${message}\n\n是否要立即向量化该Sitemap文档？`,
				);

				if (shouldVectorize) {
					// 关闭爬取窗口
					setIsWebCrawlerOpen(false);

					// 寻找最新的Sitemap文档
					const latestDoc = documents.find(
						(doc) =>
							(doc.name.includes("Sitemap") ||
								doc.fileUrl?.includes("sitemap")) &&
							doc.vectorizationStatus === "pending",
					);

					if (latestDoc) {
						// 设置向量化状态
						setIsVectorizing(true);
						setVectorizingDocId(latestDoc.id);

						await vectorizeDocument({
							kbId: selectedKb.id,
							documentId: latestDoc.id,
							collectionName: QDRANT_COLLECTION_NAME,
							url: "",
						});

						// 重置向量化状态
						setIsVectorizing(false);
						setVectorizingDocId(null);

						// 再次刷新文档列表
						docsQuery.refetch();
					} else {
						// 如果找不到文档，提示用户
						alert("找不到刚刚创建的文档。请在文档列表中手动刷新并向量化。");
					}
				} else {
					// 用户不想向量化，也关闭窗口
					setIsWebCrawlerOpen(false);
				}
			};

			handleSitemapComplete();
		}
	}, [
		sitemapCrawlComplete,
		sitemapCrawlMessage,
		selectedKb,
		documents,
		docsQuery,
		vectorizeDocument,
	]);

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

	// Web crawler handlers
	const handleOpenWebCrawlerDialog = () => setIsWebCrawlerOpen(true);
	const handleCloseWebCrawlerDialog = () => setIsWebCrawlerOpen(false);

	// 修改后的handleCrawlComplete - 不在函数内部调用Hooks
	const handleCrawlComplete = async (
		content: string,
		title: string,
		description?: string,
		fileUrl?: string,
	) => {
		if (!selectedKb) return;

		// 如果内容为空且有描述，说明文档已在服务器端创建（Sitemap模式）
		if (content === "" && description) {
			console.log("文档已在服务器端创建:", description);

			// 设置状态触发useEffect中的处理逻辑
			setSitemapCrawlMessage(description);
			setSitemapCrawlComplete(true);

			return;
		}

		try {
			// 处理单个URL爬取
			// 确保文本为UTF-8编码
			const textEncoder = new TextEncoder();

			// 处理标题和描述
			const encodedTitle = textEncoder.encode(title);
			const decodedTitle = new TextDecoder("utf-8").decode(encodedTitle);

			let processedDescription = description;
			if (description) {
				const encodedDesc = textEncoder.encode(description);
				processedDescription = new TextDecoder("utf-8").decode(encodedDesc);
			}

			// 处理内容
			const encodedContent = textEncoder.encode(content);
			const decodedContent = new TextDecoder("utf-8").decode(encodedContent);

			// 组合成最终文档内容
			const documentContent = processedDescription
				? `# ${decodedTitle}\n\n_${processedDescription}_\n\n${decodedContent}`
				: `# ${decodedTitle}\n\n${decodedContent}`;

			// 创建文件对象，使用UTF-8编码
			const file = new File([documentContent], `${decodedTitle}.md`, {
				type: "text/markdown; charset=utf-8",
			});

			// 上传文档
			const result = await createDocument({
				name: decodedTitle,
				kbId: selectedKb.id,
				file,
			});

			// 询问是否向量化
			if (result?.id) {
				const shouldVectorize = confirm("网页内容已保存。是否要立即向量化？");

				// 关闭爬取窗口
				setIsWebCrawlerOpen(false);

				if (shouldVectorize) {
					// 设置向量化状态
					setIsVectorizing(true);
					setVectorizingDocId(result.id);

					await vectorizeDocument({
						kbId: selectedKb.id,
						documentId: result.id,
						collectionName: QDRANT_COLLECTION_NAME,
						url: fileUrl || "",
					});

					// 重置向量化状态
					setIsVectorizing(false);
					setVectorizingDocId(null);
				}
			}
		} catch (error) {
			console.error("保存爬取内容失败:", error);
			alert("保存爬取内容失败，请重试。");
		}
	};

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
			// 设置向量化状态
			setIsVectorizing(true);
			setVectorizingDocId(documentId);

			await vectorizeDocument({
				kbId: selectedKb.id,
				documentId,
				collectionName: QDRANT_COLLECTION_NAME,
				url: "",
			});

			// 重置向量化状态
			setIsVectorizing(false);
			setVectorizingDocId(null);

			// 重新加载文档列表，以获取更新的状态
			docsQuery.refetch();
		} catch (error) {
			console.error("向量化文档失败:", error);
			alert("向量化文档失败，请重试");

			// 重置向量化状态
			setIsVectorizing(false);
			setVectorizingDocId(null);
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

	return {
		// 状态
		tab,
		selectedKb,
		isAddKbOpen,
		isAddDocOpen,
		isWebCrawlerOpen,
		kbs,
		isLoadingKbs,
		documents,
		isLoadingDocuments,
		isVectorizing,
		vectorizingDocId,

		// Dialog 控制函数
		setIsAddKbOpen,
		setIsAddDocOpen,
		setIsWebCrawlerOpen,

		// 处理函数
		handleOpenAddKbDialog,
		handleSubmitKb,
		handleDeleteKb,
		handleOpenAddDocDialog,
		handleCloseAddDocDialog,
		handleOpenWebCrawlerDialog,
		handleCloseWebCrawlerDialog,
		handleCrawlComplete,
		handleSubmitDoc,
		handleDeleteDocument,
		handleVectorizeDocument,
		handleSelectKb,
		handleBackToList,
	};
}
