"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { api } from "@/utils/api";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MigrateDocumentsProps {
	kbId?: string;
}

export function MigrateDocuments({ kbId }: MigrateDocumentsProps) {
	const [isRunning, setIsRunning] = useState(false);
	const [batchSize, setBatchSize] = useState(10);
	const [progress, setProgress] = useState(0);
	const [totalConverted, setTotalConverted] = useState(0);
	const [totalFailed, setTotalFailed] = useState(0);

	const batchConvertMutation =
		api.documents.batchConvertDocumentsToMarkdown.useMutation();

	const runMigration = async () => {
		setIsRunning(true);
		setProgress(0);
		setTotalConverted(0);
		setTotalFailed(0);

		try {
			let keepGoing = true;
			let iteration = 0;

			while (keepGoing) {
				iteration++;

				// Run a batch
				const result = await batchConvertMutation.mutateAsync({
					kbId,
					limit: batchSize,
				});

				// Update totals
				setTotalConverted((prev) => prev + result.convertedCount);
				setTotalFailed((prev) => prev + (result.failedCount || 0));

				// Update progress (approximate as we don't know total count)
				setProgress(iteration * 10);

				// Stop if no more documents to convert
				if (result.convertedCount === 0) {
					keepGoing = false;
					toast.success("所有文档迁移完成！");
				}

				// Safety stop after 10 iterations
				if (iteration >= 10) {
					keepGoing = false;
					toast.info("已处理10批文档，请刷新页面查看结果或重新运行迁移以继续");
				}
			}
		} catch (error) {
			toast.error("迁移过程中发生错误");
			console.error("文档迁移错误:", error);
		} finally {
			setIsRunning(false);
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>文档格式迁移</CardTitle>
				<CardDescription>
					将现有文档转换为Markdown格式，更新所有文档链接
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="batchSize">每批处理数量</Label>
						<Input
							id="batchSize"
							type="number"
							min={1}
							max={100}
							value={batchSize}
							onChange={(e) => setBatchSize(Number(e.target.value))}
							disabled={isRunning}
						/>
					</div>

					{isRunning && (
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>进度</span>
								<span>{progress}%</span>
							</div>
							<Progress value={progress} className="h-2" />
							<div className="pt-2 text-muted-foreground text-sm">
								已转换: {totalConverted} 个文档
								{totalFailed > 0 && `, 失败: ${totalFailed} 个文档`}
							</div>
						</div>
					)}
				</div>
			</CardContent>
			<CardFooter>
				<Button onClick={runMigration} disabled={isRunning} className="w-full">
					{isRunning ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							迁移中...
						</>
					) : (
						"开始迁移"
					)}
				</Button>
			</CardFooter>
		</Card>
	);
}
