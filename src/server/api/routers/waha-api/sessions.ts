import type {
	SessionCreateRequest,
	SessionLogoutRequest as SessionLogoutDeprecatedRequest,
	SessionStartRequest as SessionStartDeprecatedRequest,
	SessionStopRequest as SessionStopDeprecatedRequest,
	SessionUpdateRequest,
} from "@/types/api-requests";
import type { MyProfile, SessionDTO, SessionInfo } from "@/types/api-responses";
import { BaseApiClient } from "./base";

// Sessions API client for managing WhatsApp sessions
export class SessionsApi extends BaseApiClient {
	async listSessions(all = false): Promise<SessionInfo[]> {
		try {
			return await this.get<SessionInfo[]>(
				`/api/sessions${all ? "?all=true" : ""}`,
			);
		} catch (error) {
			throw new Error(`Failed to list sessions: ${(error as Error).message}`);
		}
	}

	async createSession(data: SessionCreateRequest): Promise<SessionDTO> {
		try {
			return await this.post<SessionDTO, SessionCreateRequest>(
				"/api/sessions",
				data,
			);
		} catch (error) {
			throw new Error(`Failed to create session: ${(error as Error).message}`);
		}
	}

	async getSession(sessionName: string): Promise<SessionInfo> {
		try {
			return await this.get<SessionInfo>(`/api/sessions/${sessionName}`);
		} catch (error) {
			throw new Error(`Failed to get session: ${(error as Error).message}`);
		}
	}

	async updateSession(
		sessionName: string,
		data: SessionUpdateRequest,
	): Promise<SessionDTO> {
		try {
			return await this.put<SessionDTO, SessionUpdateRequest>(
				`/api/sessions/${sessionName}`,
				data,
			);
		} catch (error) {
			throw new Error(`Failed to update session: ${(error as Error).message}`);
		}
	}

	async deleteSession(sessionName: string): Promise<void> {
		try {
			await this.delete(`/api/sessions/${sessionName}`);
		} catch (error) {
			throw new Error(`Failed to delete session: ${(error as Error).message}`);
		}
	}

	async getMeInfo(sessionName: string): Promise<MyProfile> {
		try {
			return await this.get<MyProfile>(`/api/sessions/${sessionName}/me`);
		} catch (error) {
			throw new Error(
				`Failed to get account info: ${(error as Error).message}`,
			);
		}
	}

	async startSession(sessionName: string): Promise<SessionDTO> {
		try {
			return await this.post<SessionDTO, null>(
				`/api/sessions/${sessionName}/start`,
			);
		} catch (error) {
			throw new Error(`Failed to start session: ${(error as Error).message}`);
		}
	}

	async stopSession(sessionName: string): Promise<SessionDTO> {
		try {
			return await this.post<SessionDTO, null>(
				`/api/sessions/${sessionName}/stop`,
			);
		} catch (error) {
			throw new Error(`Failed to stop session: ${(error as Error).message}`);
		}
	}

	async logoutSession(sessionName: string): Promise<SessionDTO> {
		try {
			return await this.post<SessionDTO, null>(
				`/api/sessions/${sessionName}/logout`,
			);
		} catch (error) {
			throw new Error(`Failed to logout: ${(error as Error).message}`);
		}
	}

	async restartSession(sessionName: string): Promise<SessionDTO> {
		try {
			return await this.post<SessionDTO, null>(
				`/api/sessions/${sessionName}/restart`,
			);
		} catch (error) {
			throw new Error(`Failed to restart session: ${(error as Error).message}`);
		}
	}

	// Deprecated endpoints
	async legacyStartSession(
		data: SessionStartDeprecatedRequest,
	): Promise<SessionDTO> {
		try {
			return await this.post<SessionDTO, SessionStartDeprecatedRequest>(
				"/api/sessions/start",
				data,
			);
		} catch (error) {
			throw new Error(`Failed to start session: ${(error as Error).message}`);
		}
	}

	async legacyStopSession(data: SessionStopDeprecatedRequest): Promise<void> {
		try {
			await this.post<void, SessionStopDeprecatedRequest>(
				"/api/sessions/stop",
				data,
			);
		} catch (error) {
			throw new Error(`Failed to stop session: ${(error as Error).message}`);
		}
	}

	async legacyLogoutSession(
		data: SessionLogoutDeprecatedRequest,
	): Promise<void> {
		try {
			await this.post<void, SessionLogoutDeprecatedRequest>(
				"/api/sessions/logout",
				data,
			);
		} catch (error) {
			throw new Error(`Failed to logout session: ${(error as Error).message}`);
		}
	}
}
