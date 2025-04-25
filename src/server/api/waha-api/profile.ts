import { BaseApiClient } from "./base";
import type {
	MyProfile,
	ProfileNameRequest,
	ProfilePictureRequest,
	ProfileStatusRequest,
	Result,
} from "./types";

// Profile API client for managing WhatsApp profile
export class ProfileApi extends BaseApiClient {
	/**
	 * Get the current user's profile information
	 */
	async getMyProfile(sessionName: string): Promise<MyProfile> {
		try {
			return await this.get<MyProfile>(`/api/${sessionName}/profile`);
		} catch (error) {
			throw new Error(`Failed to get profile: ${(error as Error).message}`);
		}
	}

	/**
	 * Set the profile name
	 */
	async setProfileName(
		sessionName: string,
		data: ProfileNameRequest,
	): Promise<Result> {
		try {
			return await this.put<Result, ProfileNameRequest>(
				`/api/${sessionName}/profile/name`,
				data,
			);
		} catch (error) {
			throw new Error(
				`Failed to set profile name: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Set the profile status (About)
	 */
	async setProfileStatus(
		sessionName: string,
		data: ProfileStatusRequest,
	): Promise<Result> {
		try {
			return await this.put<Result, ProfileStatusRequest>(
				`/api/${sessionName}/profile/status`,
				data,
			);
		} catch (error) {
			throw new Error(
				`Failed to set profile status: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Set the profile picture
	 */
	async setProfilePicture(
		sessionName: string,
		data: ProfilePictureRequest,
	): Promise<Result> {
		try {
			return await this.put<Result, ProfilePictureRequest>(
				`/api/${sessionName}/profile/picture`,
				data,
			);
		} catch (error) {
			throw new Error(
				`Failed to set profile picture: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Delete the profile picture
	 */
	async deleteProfilePicture(sessionName: string): Promise<Result> {
		try {
			return await this.delete<Result>(`/api/${sessionName}/profile/picture`);
		} catch (error) {
			throw new Error(
				`Failed to delete profile picture: ${(error as Error).message}`,
			);
		}
	}
}
