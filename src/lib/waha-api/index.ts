// Import API modules
import { AuthApi } from "./auth";
import { ChattingApi } from "./chatting";
import { ProfileApi } from "./profile";
import { SessionsApi } from "./sessions";

// Main API Client that combines all modules
class WahaApiClient {
	public sessions: SessionsApi;
	public auth: AuthApi;
	public profile: ProfileApi;
	public chatting: ChattingApi;

	constructor(customApiUrl?: string) {
		this.sessions = new SessionsApi(customApiUrl);
		this.auth = new AuthApi(customApiUrl);
		this.profile = new ProfileApi(customApiUrl);
		this.chatting = new ChattingApi(customApiUrl);
	}
}

// 创建针对特定实例的 API 客户端
export function createInstanceApiClient(customApiUrl?: string): WahaApiClient {
	return new WahaApiClient(customApiUrl);
}

// // Export singleton instance (使用默认 API URL)
// export const wahaApi = new WahaApiClient();
