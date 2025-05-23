import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, RotateCw, Users } from "lucide-react";
import { useState } from "react";

interface AddInstanceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (
		agentId: string,
		userWebhooks?: string[],
		userWahaApiEndpoint?: string,
		userWahaApiKey?: string,
	) => Promise<void>;
	selectedAgentId: string;
	setSelectedAgentId: (id: string) => void;
	isLoading: boolean;
	agents: Array<{ id: string; name: string }>;
	isLoadingAgents: boolean;
	// Queue status props
	queuePosition?: number;
	estimatedWaitTime?: number;
	isQueued?: boolean;
	waitingCount?: number;
	// Timeout props
	isTimeout?: boolean;
	errorMessage?: string;
	onRetry?: () => Promise<void>;
	// Webhooks props
	userWebhooks: string[];
	setUserWebhooks: (urls: string[]) => void;
	// WAHA API 端点
	userWahaApiEndpoint: string;
	setUserWahaApiEndpoint: (url: string) => void;
	// WAHA API Key
	userWahaApiKey: string;
	setUserWahaApiKey: (key: string) => void;
}

export function AddInstanceDialog({
	open,
	onOpenChange,
	onSubmit,
	selectedAgentId,
	setSelectedAgentId,
	isLoading,
	agents,
	isLoadingAgents,
	queuePosition,
	estimatedWaitTime,
	isQueued,
	waitingCount,
	isTimeout,
	errorMessage,
	onRetry,
	userWebhooks,
	setUserWebhooks,
	userWahaApiEndpoint,
	setUserWahaApiEndpoint,
	userWahaApiKey,
	setUserWahaApiKey,
}: AddInstanceDialogProps) {
	// 添加状态控制API Key可见性
	const [showApiKey, setShowApiKey] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSubmit(
			selectedAgentId,
			userWebhooks,
			userWahaApiEndpoint,
			userWahaApiKey,
		);
	};

	const handleWebhookChange = (index: number, value: string) => {
		const newWebhooks = [...userWebhooks];
		newWebhooks[index] = value;
		setUserWebhooks(newWebhooks);
	};

	const handleAddWebhook = () => {
		setUserWebhooks([...userWebhooks, ""]);
	};

	const handleRemoveWebhook = (index: number) => {
		const newWebhooks = userWebhooks.filter((_, i) => i !== index);
		setUserWebhooks(newWebhooks);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>添加WhatsApp账号</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="agent">
								AI机器人 <span className="text-destructive">*</span>
							</Label>
							<select
								id="agent"
								value={selectedAgentId}
								onChange={(e) => setSelectedAgentId(e.target.value)}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								required
							>
								<option value="">选择一个AI机器人</option>
								{!isLoadingAgents &&
									agents.map((agent) => (
										<option key={agent.id} value={agent.id}>
											{agent.name}
										</option>
									))}
							</select>
							<p className="text-muted-foreground text-xs">
								选择要与此WhatsApp账号关联的AI机器人。
							</p>
						</div>

						{/* 自定义 WAHA API 端点输入 */}
						<div className="grid gap-2">
							<Label htmlFor="wahaApi">
								自定义 WAHA API 端点 <span className="text-destructive">*</span>
							</Label>
							<input
								id="wahaApi"
								type="url"
								placeholder="https://waha-api-endpoint.com"
								value={userWahaApiEndpoint}
								onChange={(e) => setUserWahaApiEndpoint(e.target.value)}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								required
							/>
							<p className="text-muted-foreground text-xs">
								请指定 WAHA API 端点。
							</p>
						</div>

						{/* WAHA API Key 输入区域 - 只在填写了API端点时显示 */}
						{userWahaApiEndpoint && (
							<div className="grid gap-2">
								<Label htmlFor="wahaApiKey">WAHA API Key (可选)</Label>
								<div className="relative">
									<input
										id="wahaApiKey"
										type={showApiKey ? "text" : "password"}
										placeholder="您的 WAHA API Key"
										value={userWahaApiKey}
										onChange={(e) => setUserWahaApiKey(e.target.value)}
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									/>
									<button
										type="button"
										className="-translate-y-1/2 absolute top-1/2 right-2 text-gray-500 hover:text-gray-700"
										onClick={() => setShowApiKey(!showApiKey)}
										aria-label={showApiKey ? "隐藏密码" : "显示密码"}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											aria-hidden="true"
										>
											{showApiKey ? (
												<>
													<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
													<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
													<path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
													<line x1="2" x2="22" y1="2" y2="22" />
												</>
											) : (
												<>
													<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
													<circle cx="12" cy="12" r="3" />
												</>
											)}
										</svg>
									</button>
								</div>
								<p className="text-muted-foreground text-xs">
									指定自定义的 WAHA API Key，留空则使用默认 Key。
								</p>
							</div>
						)}

						{/* Webhooks 输入区域 */}
						<div className="grid gap-2">
							<Label htmlFor="webhooks">自定义 Webhook URL (可选)</Label>
							{userWebhooks.map((webhook, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								<div key={index} className="flex items-center gap-2">
									<input
										type="url"
										placeholder="https://example.com/webhook"
										value={webhook}
										onChange={(e) => handleWebhookChange(index, e.target.value)}
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => handleRemoveWebhook(index)}
										disabled={
											userWebhooks.length === 0 && index === 0 && !webhook
										}
									>
										移除
									</Button>
								</div>
							))}
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleAddWebhook}
								className="mt-1"
							>
								添加 Webhook
							</Button>
							<p className="text-muted-foreground text-xs">
								在此处添加的 Webhook URL 将用于接收来自此 WhatsApp
								账号的事件通知。
							</p>
						</div>

						{/* 超时状态显示区域 */}
						{isTimeout && (
							<div className="mt-4 space-y-2 rounded-md bg-destructive/10 p-4">
								<div className="flex items-center gap-2">
									<AlertTriangle className="h-4 w-4 text-destructive" />
									<p className="font-medium text-destructive text-sm">
										{errorMessage || "创建会话超时"}
									</p>
								</div>

								<p className="text-muted-foreground text-xs">
									创建会话操作超过了15秒未能完成，请点击重试按钮再次尝试。
								</p>

								<div className="mt-2 flex justify-end">
									<Button
										size="sm"
										onClick={onRetry}
										disabled={isLoading}
										type="button"
										variant="outline"
										className="gap-1"
									>
										{isLoading ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<RotateCw className="h-3.5 w-3.5" />
										)}
										重试
									</Button>
								</div>
							</div>
						)}

						{/* 队列状态显示区域 */}
						{isQueued && !isTimeout && (
							<div className="mt-4 space-y-2 rounded-md bg-muted p-4">
								<div className="flex items-center gap-2">
									<Users className="h-4 w-4 text-primary" />
									<p className="font-medium text-sm">您的请求已加入队列</p>
								</div>

								<div className="space-y-1">
									{queuePosition !== undefined && (
										<div className="flex items-center gap-2">
											<div className="h-2 w-2 rounded-full bg-amber-500" />
											<p className="text-muted-foreground text-xs">
												队列位置: {queuePosition + 1}
											</p>
										</div>
									)}

									{waitingCount !== undefined && (
										<div className="flex items-center gap-2">
											<div className="h-2 w-2 rounded-full bg-blue-500" />
											<p className="text-muted-foreground text-xs">
												等待人数: {waitingCount} 人
											</p>
										</div>
									)}

									{estimatedWaitTime !== undefined && (
										<div className="flex items-center gap-2">
											<div className="h-2 w-2 rounded-full bg-green-500" />
											<p className="text-muted-foreground text-xs">
												预计等待时间: {Math.ceil(estimatedWaitTime / 60)} 分钟
											</p>
										</div>
									)}
								</div>

								<div className="my-2 h-1.5 w-full rounded-full bg-background">
									<div
										className="h-1.5 animate-pulse rounded-full bg-primary"
										style={{
											width:
												queuePosition !== undefined
													? `${Math.max(5, 100 - queuePosition * 10)}%`
													: "5%",
										}}
									/>
								</div>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							取消
						</Button>
						<Button
							type="submit"
							disabled={
								!selectedAgentId ||
								!userWahaApiEndpoint ||
								isLoading ||
								isTimeout
							}
						>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" /> 创建中...
								</>
							) : (
								"添加账号"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
