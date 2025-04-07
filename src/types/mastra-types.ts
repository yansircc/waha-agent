import { z } from "zod";

// Core message type used in communication
export interface MastraMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

// Agent interfaces
export interface MastraAgent {
	id: string;
	name: string;
	description?: string;
	capabilities?: string[];
}

// Request/Response Types
export interface MastraGenerateRequest {
	messages: MastraMessage[];
	threadId?: string;
	resourceId?: string;
	runId?: string;
	output?: Record<string, unknown>;
}

export interface MastraGenerateResponse {
	text: string;
	threadId?: string;
	resourceId?: string;
	runId?: string;
	metadata?: Record<string, unknown>;
}

// Weather agent specific types
export interface WeatherInfo {
	location: string;
	temperature: number;
	condition: string;
	humidity: number;
	windSpeed: number;
}

export interface WeatherResponse extends MastraGenerateResponse {
	weatherData?: WeatherInfo;
}
