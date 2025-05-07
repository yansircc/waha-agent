import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { History, Loader2, RefreshCcw } from "lucide-react";

interface FormConfigAltertProps {
	hasIncompleteForm: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	savedFormState: any;
	getIncompleteFormStatus: () => string;
	handleOpenCreateDialog: () => void;
	handleResetIncompleteForm: () => void;
	handleRefreshFormState: () => void;
	isRefreshingState: boolean;
}

export function FormConfigAltert({
	hasIncompleteForm,
	savedFormState,
	getIncompleteFormStatus,
	handleOpenCreateDialog,
	handleResetIncompleteForm,
	handleRefreshFormState,
	isRefreshingState,
}: FormConfigAltertProps) {
	if (!hasIncompleteForm) return null;

	return (
		<Alert className="mb-8 border-blue-200 bg-blue-50">
			<Info className="h-4 w-4 text-blue-500" />
			<AlertTitle className="text-blue-700">您有未完成的邮件配置</AlertTitle>
			<AlertDescription className="text-blue-600">
				<div className="mb-2">
					<p>
						<span className="font-medium">邮箱地址:</span>{" "}
						{String(savedFormState?.emailAddress || "")}
					</p>
					<p>
						<span className="font-medium">当前进度:</span>{" "}
						{getIncompleteFormStatus()}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200"
						onClick={handleOpenCreateDialog}
					>
						<History className="mr-2 h-3 w-3" /> 继续设置
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
						onClick={handleResetIncompleteForm}
					>
						<RefreshCcw className="mr-2 h-3 w-3" /> 放弃并重新开始
					</Button>
					{!isRefreshingState ? (
						<Button
							variant="ghost"
							size="sm"
							className="text-blue-600 hover:bg-blue-50"
							onClick={handleRefreshFormState}
						>
							<RefreshCcw className="mr-2 h-3 w-3" /> 刷新状态
						</Button>
					) : (
						<Button
							variant="ghost"
							size="sm"
							className="text-blue-600"
							disabled
						>
							<Loader2 className="mr-2 h-3 w-3 animate-spin" /> 刷新中...
						</Button>
					)}
				</div>
			</AlertDescription>
		</Alert>
	);
}
