// Re-export types from the types file
export * from "./types";

// Import API modules
import { AuthApi } from "./auth";
import { ChattingApi } from "./chatting";
import { ContactsApi } from "./other";
import { GroupsApi } from "./other";
import { MessagesApi } from "./other";
import { ProfileApi } from "./profile";
import { SessionsApi } from "./sessions";

// Main API Client that combines all modules
class WahaApiClient {
	public sessions: SessionsApi;
	public auth: AuthApi;
	public messages: MessagesApi;
	public contacts: ContactsApi;
	public groups: GroupsApi;
	public profile: ProfileApi;
	public chatting: ChattingApi;

	constructor() {
		this.sessions = new SessionsApi();
		this.auth = new AuthApi();
		this.messages = new MessagesApi();
		this.contacts = new ContactsApi();
		this.groups = new GroupsApi();
		this.profile = new ProfileApi();
		this.chatting = new ChattingApi();
	}
}

// Export singleton instance
export const wahaApi = new WahaApiClient();
