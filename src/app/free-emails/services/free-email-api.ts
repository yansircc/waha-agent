import type { FreeEmailFormInput } from "../types";

/**
 * Service for interacting with the formsubmit.co API
 */
export const freeEmailApiService = {
	/**
	 * Check if a formsubmit.co alias is valid
	 * This is a simple validation - formsubmit.co doesn't provide a validation API
	 */
	validateAlias: async (
		emailAddress: string,
		alias: string,
	): Promise<boolean> => {
		// In a real implementation, you would check with formsubmit.co
		// but they don't offer an API for validation
		// For now, we'll just do basic validation
		return /^[a-zA-Z0-9_-]+$/.test(alias) && alias.length > 0;
	},

	/**
	 * Check Plunk API key validity
	 */
	validatePlunkApiKey: async (apiKey: string): Promise<boolean> => {
		// For demo purposes only - in production, you would validate against Plunk API
		return true;
		// return apiKey.startsWith("plunk_") && apiKey.length > 10;
	},

	/**
	 * Check WeChat Push API key validity
	 */
	validateWechatPushApiKey: async (apiKey: string): Promise<boolean> => {
		// For demo purposes only
		return apiKey.startsWith("SCT") && apiKey.length > 5;
	},

	/**
	 * Get the formsubmit endpoint URL based on the email alias
	 */
	getFormSubmitEndpoint: (alias: string): string => {
		return `https://formsubmit.co/${alias}`;
	},

	/**
	 * Save the complete form data to your backend
	 */
	saveFreeEmailConfig: async (
		formData: FreeEmailFormInput,
		userId: string,
	): Promise<{ success: boolean; id?: string; error?: string }> => {
		try {
			// In a real implementation, you would save this to your database
			// through your API
			return {
				success: true,
				id: crypto.randomUUID(),
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			};
		}
	},
};
