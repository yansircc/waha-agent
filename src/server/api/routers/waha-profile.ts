import { wahaApi } from "@/lib/waha-api";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	MyProfileSchema,
	ProfileNameRequestSchema,
	ProfilePictureRequestSchema,
	ProfileStatusRequestSchema,
	ResultSchema,
} from "@/types/schemas";
import { z } from "zod";

export const wahaProfileRouter = createTRPCRouter({
	// Get profile information
	getProfile: protectedProcedure
		.input(z.object({ session: z.string().default("default") }))
		.query(async ({ input }) => {
			try {
				const profile = await wahaApi.profile.getMyProfile(input.session);
				return MyProfileSchema.parse(profile);
			} catch (error) {
				throw new Error(`Failed to get profile: ${(error as Error).message}`);
			}
		}),

	// Set profile name
	setName: protectedProcedure
		.input(
			z.object({
				session: z.string().default("default"),
				data: ProfileNameRequestSchema,
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.profile.setProfileName(
					input.session,
					input.data,
				);
				return ResultSchema.parse(result);
			} catch (error) {
				throw new Error(
					`Failed to set profile name: ${(error as Error).message}`,
				);
			}
		}),

	// Set profile status
	setStatus: protectedProcedure
		.input(
			z.object({
				session: z.string().default("default"),
				data: ProfileStatusRequestSchema,
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.profile.setProfileStatus(
					input.session,
					input.data,
				);
				return ResultSchema.parse(result);
			} catch (error) {
				throw new Error(
					`Failed to set profile status: ${(error as Error).message}`,
				);
			}
		}),

	// Set profile picture
	setPicture: protectedProcedure
		.input(
			z.object({
				session: z.string().default("default"),
				data: ProfilePictureRequestSchema,
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.profile.setProfilePicture(
					input.session,
					input.data,
				);
				return ResultSchema.parse(result);
			} catch (error) {
				throw new Error(
					`Failed to set profile picture: ${(error as Error).message}`,
				);
			}
		}),

	// Delete profile picture
	deletePicture: protectedProcedure
		.input(z.object({ session: z.string().default("default") }))
		.mutation(async ({ input }) => {
			try {
				const result = await wahaApi.profile.deleteProfilePicture(
					input.session,
				);
				return ResultSchema.parse(result);
			} catch (error) {
				throw new Error(
					`Failed to delete profile picture: ${(error as Error).message}`,
				);
			}
		}),
});
