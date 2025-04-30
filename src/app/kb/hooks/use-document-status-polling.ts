"use client";

import type { Document } from "@/types/document";
import { api } from "@/utils/api";
import { useEffect, useRef, useState } from "react";

/**
 * 钩子用于轮询处理中的文档状态
 * @param documents 文档列表
 * @param onStatusUpdate 当文档状态更新时的回调
 * @param pollingInterval 轮询间隔（毫秒）
 */
export function useDocumentStatusPolling(
	documents: Document[],
	onStatusUpdate: (updates: Record<string, string>) => void,
	pollingInterval = 5000,
) {
	// 跟踪处理中的文档ID
	const [processingDocIds, setProcessingDocIds] = useState<string[]>([]);
	const [isPolling, setIsPolling] = useState(false);

	// 使用ref记录已经处理过的更新，避免重复处理
	const processedUpdatesRef = useRef<Record<string, string>>({});

	// 使用较简单的查询方式，避免自定义选项造成的类型问题
	const documentUpdatesQuery = api.documents.getDocumentUpdates.useQuery(
		{ documentIds: processingDocIds },
		{
			enabled: processingDocIds.length > 0 && isPolling,
			refetchInterval: processingDocIds.length > 0 ? pollingInterval : false,
		},
	);

	// 当数据更新时处理状态变化，使用useEffect而不是回调避免循环更新
	useEffect(() => {
		const data = documentUpdatesQuery.data;
		if (data?.updates && data.updates.length > 0) {
			const statusUpdates: Record<string, string> = {};
			let hasNewUpdates = false;

			// 处理更新
			for (const update of data.updates) {
				if (update.status) {
					// 检查这个更新是否已经处理过
					const currentStatus = processedUpdatesRef.current[update.documentId];
					if (currentStatus !== update.status) {
						statusUpdates[update.documentId] = update.status;
						processedUpdatesRef.current[update.documentId] = update.status;
						hasNewUpdates = true;
					}
				}
			}

			// 只有当有新的状态更新时才通知父组件
			if (hasNewUpdates && Object.keys(statusUpdates).length > 0) {
				onStatusUpdate(statusUpdates);

				// 移除已完成或失败的文档ID
				setProcessingDocIds((prev) =>
					prev.filter(
						(id) =>
							!statusUpdates[id] ||
							(statusUpdates[id] !== "completed" &&
								statusUpdates[id] !== "failed"),
					),
				);
			}
		}
	}, [documentUpdatesQuery.data, onStatusUpdate]);

	// 当文档列表变化时，检查处理中的文档
	useEffect(() => {
		const processingIds = documents
			.filter((doc) => doc.vectorizationStatus === "processing")
			.map((doc) => doc.id);

		// 只在有变化时更新
		const shouldUpdate =
			processingIds.length !== processingDocIds.length ||
			processingIds.some((id) => !processingDocIds.includes(id)) ||
			processingDocIds.some((id) => !processingIds.includes(id));

		if (shouldUpdate) {
			if (processingIds.length > 0) {
				setProcessingDocIds(processingIds);
				setIsPolling(true);
			} else {
				setProcessingDocIds([]);
				setIsPolling(false);
			}
		}
	}, [documents, processingDocIds]);

	// 提供添加新的处理中文档的方法
	const addProcessingDocument = (documentId: string) => {
		setProcessingDocIds((prev) => {
			if (prev.includes(documentId)) return prev;
			return [...prev, documentId];
		});
		setIsPolling(true);
	};

	return {
		isPolling,
		processingDocIds,
		addProcessingDocument,
	};
}
