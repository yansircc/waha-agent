import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { RequestCodeRequest } from "@/types/api-requests";
import type { QRCodeResponse } from "@/types/api-responses";
import { QRCodeRequestSchema, RequestCodeRequestSchema } from "@/types/schemas";
import { z } from "zod";
import { wahaApi } from "../waha-api";

export const wahaAuthRouter = createTRPCRouter({
	// Get QR code for pairing WhatsApp API
	getQR: protectedProcedure
		.input(QRCodeRequestSchema)
		.query(async ({ input }) => {
			try {
				const qrData = await wahaApi.auth.getQRCode(
					input.session,
					input.format,
				);

				// For image format, expect Base64 data without parsing
				if (
					input.format === "image" &&
					typeof qrData === "object" &&
					qrData !== null
				) {
					// If data is already in the expected format, return it
					if ("data" in qrData && "mimetype" in qrData) {
						return qrData as QRCodeResponse;
					}
					// If QR is not ready yet, return null
					return null;
				}

				// For raw format or other responses, try to parse
				return qrData;
			} catch (error) {
				console.error("QR code fetch error:", error);
				// If parsing fails, return null instead of throwing
				return null;
			}
		}),

	// Request authentication code
	requestCode: protectedProcedure
		.input(
			z.object({
				session: z.string().default("default"),
				data: RequestCodeRequestSchema,
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const requestData: RequestCodeRequest = input.data;
				await wahaApi.auth.requestCode(input.session, requestData);
				return { success: true };
			} catch (error) {
				throw new Error(
					`Failed to request authentication code: ${(error as Error).message}`,
				);
			}
		}),
});
