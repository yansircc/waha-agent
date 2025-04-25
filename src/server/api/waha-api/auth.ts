import { BaseApiClient } from "./base";
import type { Base64File, QRCodeValue, RequestCodeRequest } from "./types";

// Auth API client for handling WhatsApp authentication
export class AuthApi extends BaseApiClient {
	async getQRCode(
		sessionName: string,
		format: "image" | "raw",
	): Promise<Base64File | QRCodeValue> {
		try {
			// Use different methods based on format
			if (format === "image") {
				// Use binary handling for image format
				return await this.getBinary(
					`/api/${sessionName}/auth/qr?format=${format}`,
				);
			}

			// Use JSON parsing for raw format
			return await this.get<QRCodeValue>(
				`/api/${sessionName}/auth/qr?format=${format}`,
			);
		} catch (error) {
			throw new Error(`Failed to get QR code: ${(error as Error).message}`);
		}
	}

	async requestCode(
		sessionName: string,
		data: RequestCodeRequest,
	): Promise<void> {
		try {
			await this.post<void, RequestCodeRequest>(
				`/api/${sessionName}/auth/request-code`,
				data,
			);
		} catch (error) {
			throw new Error(
				`Failed to request authentication code: ${(error as Error).message}`,
			);
		}
	}
}
