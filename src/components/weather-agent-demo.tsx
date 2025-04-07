"use client";

import { Button } from "@/components/ui/button";
import { Cloud } from "lucide-react";
import { useState } from "react";
import { AgentChatDialog } from "./agent-chat-dialog";

export function WeatherAgentDemo() {
	const [dialogOpen, setDialogOpen] = useState(false);

	return (
		<div className="flex flex-col items-center gap-4 py-8">
			<div className="flex max-w-md flex-col items-center gap-2 text-center">
				<Cloud className="h-12 w-12 text-blue-500" />
				<h2 className="font-bold text-2xl">Weather Assistant</h2>
				<p className="text-muted-foreground">
					Ask about weather conditions in any location. Powered by Mastra API.
				</p>
			</div>

			<Button size="lg" onClick={() => setDialogOpen(true)} className="mt-4">
				<Cloud className="mr-2 h-4 w-4" />
				Ask about weather
			</Button>

			<AgentChatDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				agentId="weatherAgent"
				agentName="Weather Assistant"
			/>
		</div>
	);
}
