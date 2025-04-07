import { WeatherAgentDemo } from "@/components/weather-agent-demo";

export const metadata = {
	title: "Weather Assistant | Waha Mastra",
	description: "Ask about weather conditions using Mastra AI",
};

export default function WeatherPage() {
	return (
		<div className="container mx-auto px-4 py-12">
			<h1 className="mb-8 text-center font-bold text-3xl">Weather Assistant</h1>

			<div className="mx-auto max-w-2xl rounded-lg bg-card p-6 shadow-sm">
				<WeatherAgentDemo />
			</div>
		</div>
	);
}
