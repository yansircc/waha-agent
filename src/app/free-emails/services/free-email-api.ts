import type { FreeEmailFormInput } from "../types";

/**
 * Service for interacting with the FormSubmit.co service
 */
export const freeEmailApiService = {
	/**
	 * Validate Plunk API key format (synchronous)
	 */
	validatePlunkApiKeySync: (apiKey: string): boolean => {
		return apiKey.startsWith("sk_") && apiKey.length > 5;
	},

	/**
	 * Validate WeChat Push API key format (synchronous)
	 */
	validateWechatPushApiKeySync: (apiKey: string): boolean => {
		return apiKey.startsWith("SCT") && apiKey.length > 5;
	},

	/**
	 * Validate Plunk API key format (async - for backward compatibility)
	 */
	validatePlunkApiKey: async (apiKey: string): Promise<boolean> => {
		return apiKey.startsWith("sk_") && apiKey.length > 5;
	},

	/**
	 * Validate WeChat Push API key format (async - for backward compatibility)
	 */
	validateWechatPushApiKey: async (apiKey: string): Promise<boolean> => {
		return apiKey.startsWith("SCT") && apiKey.length > 5;
	},

	/**
	 * Generate FormSubmit form HTML code based on configuration
	 */
	generateFormCode: (config: FreeEmailFormInput, appUrl: string): string => {
		const {
			alias,
			ccEmails,
			redirectUrl,
			disableCaptcha,
			enableFileUpload,
			customWebhooks,
		} = config;

		// Build hidden fields
		const hiddenFields: string[] = [];

		// Required webhook for our API
		hiddenFields.push(
			`  <input type="hidden" name="_webhook" value="${appUrl}/api/webhooks/email/${alias}" />`,
		);

		// Add custom webhooks if provided
		if (customWebhooks?.trim()) {
			hiddenFields.push(
				`  <input type="hidden" name="_custom_webhooks" value="${customWebhooks}" />`,
			);
		}

		// Add CC emails if provided
		if (ccEmails?.trim()) {
			const emailList = ccEmails
				.split(",")
				.map((email) => email.trim())
				.filter((email) => email.length > 0)
				.join(",");

			if (emailList) {
				hiddenFields.push(
					`  <input type="hidden" name="_cc" value="${emailList}" />`,
				);
			}
		}

		// Add redirect URL if provided
		if (redirectUrl?.trim()) {
			hiddenFields.push(
				`  <input type="hidden" name="_next" value="${redirectUrl}" />`,
			);
		}

		// Add captcha setting
		if (disableCaptcha) {
			hiddenFields.push(
				'  <input type="hidden" name="_captcha" value="false" />',
			);
		}

		// Add replyto (always include for reply)
		hiddenFields.push('  <input type="hidden" name="_replyto" />');

		// Add template (always use table)
		hiddenFields.push(
			'  <input type="hidden" name="_template" value="table" />',
		);

		// Add honeypot (always include for spam protection)
		hiddenFields.push(
			'  <input type="text" name="_honey" style="display:none" />',
		);

		// Build form HTML
		const formAction = `https://formsubmit.co/${alias}`;
		return `<form action="${formAction}" method="POST">
  <div>
    <label for="email">Email</label>
    <input name="email" type="email" required />
  </div>
  <div>
    <label for="name">Name</label>
    <input name="name" type="text" required />
  </div>
  <div>
    <label for="message">Message</label>
    <textarea name="message" rows="4" required></textarea>
  </div>${enableFileUpload ? '\n  <div>\n    <label for="attachment">Attachment</label>\n    <input name="attachment" type="file" accept="image/png, image/jpeg, .pdf, .doc, .docx" />\n  </div>' : ""}
${hiddenFields.join("\n")}
  <button type="submit">Submit</button>
</form>`;
	},

	/**
	 * Save the complete form data to your backend
	 */
	saveFreeEmailConfig: async (
		formData: FreeEmailFormInput,
		userId: string,
	): Promise<{ success: boolean; id?: string; error?: string }> => {
		try {
			console.log("saveFreeEmailConfig", formData, userId);
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
