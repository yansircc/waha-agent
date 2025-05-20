import type { InstanceStatus } from "./index";

export interface InstanceCreateInput {
	name: string;
	phoneNumber?: string;
	agentId?: string;
	userWebhooks?: string[];
	userWahaApiEndpoint?: string;
	userWahaApiKey?: string;
}

export interface InstanceUpdateInput {
	id: string;
	name?: string;
	phoneNumber?: string;
	agentId?: string;
	status?: InstanceStatus;
	qrCode?: string;
	sessionData?: Record<string, unknown>;
	userWebhooks?: string[];
	userWahaApiEndpoint?: string;
	userWahaApiKey?: string;
}
