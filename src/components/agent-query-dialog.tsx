"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAgentQuery } from "@/hooks/use-agent-query";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AutoResizeTextarea } from "./autoresize-textarea";

const formSchema = z.object({
	question: z.string().min(1, {
		message: "请输入要查询的问题",
	}),
	knowledgeBaseIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AgentQueryDialogProps {
	agentId: string;
	agentName: string;
	trigger?: React.ReactNode;
}

export function AgentQueryDialog({
	agentId,
	agentName,
	trigger,
}: AgentQueryDialogProps) {
	const [open, setOpen] = useState(false);
	const { data: knowledgeBases } = api.knowledgeBases.getAll.useQuery();
	const { data: agentKnowledgeBases } = api.agents.getKnowledgeBases.useQuery(
		{ agentId },
		{
			enabled: open,
		},
	);

	const { isLoading, queryWithAgent, answer, error, sources } = useAgentQuery({
		onSuccess: () => {
			form.reset();
		},
		onError: (error) => {
			console.error("查询失败", error);
		},
	});

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			question: "",
			knowledgeBaseIds: [],
		},
	});

	function onSubmit(values: FormValues) {
		queryWithAgent(agentId, values.question, values.knowledgeBaseIds);
	}

	const linkedKnowledgeBaseIds =
		agentKnowledgeBases?.map((kb) => kb.knowledgeBaseId) || [];

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="outline" size="sm">
						<Search className="mr-2 h-4 w-4" />
						使用此Agent查询
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[725px]">
				<DialogHeader>
					<DialogTitle>使用 {agentName} 查询知识库</DialogTitle>
					<DialogDescription>选择要查询的知识库并提出问题</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="knowledgeBaseIds"
							render={() => (
								<FormItem>
									<FormLabel>选择要查询的知识库</FormLabel>
									<div className="mt-2">
										<ScrollArea className="h-[120px] rounded-md border p-2">
											{knowledgeBases?.map((kb) => (
												<FormField
													key={kb.id}
													control={form.control}
													name="knowledgeBaseIds"
													render={({ field }) => {
														const isLinked = linkedKnowledgeBaseIds.includes(
															kb.id,
														);
														return (
															<FormItem
																key={kb.id}
																className="flex flex-row items-start space-x-3 space-y-0 p-2"
															>
																<FormControl>
																	<Checkbox
																		defaultChecked={isLinked}
																		checked={field.value?.includes(kb.id)}
																		onCheckedChange={(checked) => {
																			const currentValue = field.value || [];
																			return checked
																				? field.onChange([
																						...currentValue,
																						kb.id,
																					])
																				: field.onChange(
																						currentValue.filter(
																							(value) => value !== kb.id,
																						),
																					);
																		}}
																	/>
																</FormControl>
																<FormLabel className="font-normal">
																	{kb.name}
																	{isLinked && (
																		<span className="ml-2 text-muted-foreground text-xs">
																			(已链接)
																		</span>
																	)}
																</FormLabel>
															</FormItem>
														);
													}}
												/>
											))}
										</ScrollArea>
									</div>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="question"
							render={({ field }) => (
								<FormItem>
									<FormLabel>问题</FormLabel>
									<FormControl>
										<AutoResizeTextarea
											placeholder="输入您的问题..."
											className="resize-none"
											{...field}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						{answer && (
							<div className="space-y-2 rounded-md border p-4">
								<h3 className="font-medium">回答：</h3>
								<p className="text-sm">{answer}</p>
								{sources && sources.length > 0 && (
									<div className="mt-4">
										<h4 className="font-medium text-sm">来源：</h4>
										<ul className="mt-2 text-muted-foreground text-xs">
											{sources.map((source, index) => (
												<li
													key={`source-${source}-${
														// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
														index
													}`}
													className="mt-1"
												>
													{source}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}

						{error && (
							<div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
								{error}
							</div>
						)}

						<DialogFooter>
							<Button variant="outline" onClick={() => setOpen(false)}>
								取消
							</Button>
							<Button type="submit" disabled={isLoading}>
								{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								查询
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
