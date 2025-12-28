/**
 * tRPC router for match-related operations
 */

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { scrapeAllMatches } from '../scraper';
import { scrapeAllMarinosMatches } from '../marinos-scraper';
import { scrapeJLeagueMatches } from '../jleague-scraper';
import { upsertMatches, getMatches } from '../db';

export const matchesRouter = router({
  /**
   * Fetch official matches from J.League and save to database
   * This is a protected procedure that only authenticated users can call
   */
  fetchOfficial: protectedProcedure
    .input(
      z.object({
        force: z.boolean().default(false).optional(),
        year: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log('[Matches Router] Starting official match fetch from Marinos site...');
        
        // Scrape matches from Marinos official site
        const { matches, errors, stats } = await scrapeAllMarinosMatches();
        
        console.log(`[Matches Router] Scraped ${stats.success} matches, ${stats.failed} errors`);
        
        if (matches.length > 0) {
          // Convert to database format
          const dbMatches = matches.map(m => ({
            sourceKey: `marinos-${m.date}-${m.opponent}`,
            date: m.date,
            kickoff: m.kickoff,
            competition: m.competition,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            opponent: m.opponent,
            stadium: m.stadium,
            marinosSide: m.marinosSide,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            isResult: m.isResult,
            matchUrl: m.sourceUrl,
          }));
          
          // Save to database
          await upsertMatches(dbMatches);
          console.log(`[Matches Router] Saved ${dbMatches.length} matches to database`);
        }
        
        return {
          success: true,
          matches: matches.length,
          errors: errors.length,
          stats,
          errorDetails: errors.slice(0, 5),
        };
        
      } catch (error) {
        console.error('[Matches Router] Error fetching official matches:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to fetch official matches'
        );
      }
    }),

  /**
   * Get all official matches from database
   */
  listOfficial: publicProcedure
    .input(
      z.object({
        year: z.number().optional(),
        competition: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const matches = await getMatches({
          year: input.year,
          competition: input.competition,
        });
        
        return {
          success: true,
          matches,
          count: matches.length,
        };
        
      } catch (error) {
        console.error('[Matches Router] Error listing matches:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to list matches'
        );
      }
    }),

  /**
   * Get a single match by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        // TODO: Implement when we have the database query
        return {
          success: false,
          message: 'Not implemented yet',
        };
      } catch (error) {
        throw new Error('Failed to get match');
      }
    }),
});
