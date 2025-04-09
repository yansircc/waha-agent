import type { AppRouter } from "@/server/api/root";
import { createQueryClient } from "@/trpc/query-client";
import { createTRPCReact } from "@trpc/react-query";

export const api = createTRPCReact<AppRouter>();
export const queryClient = createQueryClient();
