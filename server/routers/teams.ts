import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { teams, users } from "../../drizzle/schema";

export const teamsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        league: z.enum(["J1", "J2", "all"]).optional().default("all"),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const leagueFilter = input?.league || "all";

      const allTeams = await db
        .select({
          id: teams.id,
          name: teams.name,
          shortName: teams.shortName,
          slug: teams.slug,
          aliases: teams.aliases,
          league: teams.league,
          emblemUrl: teams.emblemUrl,
          primaryColor: teams.primaryColor,
          secondaryColor: teams.secondaryColor,
          stadiumName: teams.stadiumName,
          stadiumAddress: teams.stadiumAddress,
          stadiumCapacity: teams.stadiumCapacity,
          isActive: teams.isActive,
        })
        .from(teams)
        .where(eq(teams.isActive, true))
        .orderBy(teams.name);

      if (leagueFilter === "all") {
        return allTeams;
      }

      return allTeams.filter((team) => team.league === leagueFilter);
    }),

  setSupported: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const team = await db
        .select()
        .from(teams)
        .where(eq(teams.id, input.teamId))
        .limit(1);

      if (team.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      await db
        .update(users)
        .set({
          supportedTeamId: input.teamId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true, teamId: input.teamId };
    }),

  getSupported: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const user = await db
      .select({
        supportedTeamId: users.supportedTeamId,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (user.length === 0 || !user[0].supportedTeamId) {
      return null;
    }

    const team = await db
      .select({
        id: teams.id,
        name: teams.name,
        shortName: teams.shortName,
        slug: teams.slug,
        aliases: teams.aliases,
        emblemUrl: teams.emblemUrl,
        primaryColor: teams.primaryColor,
        secondaryColor: teams.secondaryColor,
      })
      .from(teams)
      .where(eq(teams.id, user[0].supportedTeamId))
      .limit(1);

    return team.length > 0 ? team[0] : null;
  }),
});
