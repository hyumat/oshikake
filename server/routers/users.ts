/**
 * Users Router
 * Issue #107: Team selection and user profile management
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserById } from "../db";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const usersRouter = router({
  // Issue #107: Select team during onboarding
  selectTeam: protectedProcedure
    .input(z.object({
      teamSlug: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const user = await getUserById(userId);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      try {
        await db
          .update(users)
          .set({ myTeamSlug: input.teamSlug })
          .where(eq(users.id, userId));

        return { success: true };
      } catch (error) {
        console.error("[Users] Failed to update team:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update team selection",
        });
      }
    }),

  // Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const user = await getUserById(userId);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      myTeamSlug: user.myTeamSlug,
      plan: user.plan,
      createdAt: user.createdAt,
    };
  }),
});
