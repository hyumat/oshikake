/**
 * Issue #144: マリノス貯金機能 - 自動トリガー
 * 
 * 試合結果確定時に該当ユーザーの貯金を自動トリガー
 */

import { getDb } from './db';
import { savingsRules, savingsHistory, matches, userMatches } from '../drizzle/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';

type MatchResult = '勝利' | '引き分け' | '敗北';

interface TriggerResult {
  userId: string;
  matchId: number;
  triggered: boolean;
  rulesTriggered: number;
  totalAmount: number;
}

function calculateMatchResult(
  homeScore: number | null,
  awayScore: number | null,
  marinosSide: 'home' | 'away' | null
): MatchResult | null {
  if (homeScore === null || awayScore === null || !marinosSide) {
    return null;
  }
  
  const marinosScore = marinosSide === 'home' ? homeScore : awayScore;
  const opponentScore = marinosSide === 'home' ? awayScore : homeScore;
  
  if (marinosScore > opponentScore) return '勝利';
  if (marinosScore < opponentScore) return '敗北';
  return '引き分け';
}

export async function triggerSavingsForMatch(
  matchId: number,
  matchData?: {
    homeScore: number | null;
    awayScore: number | null;
    marinosSide: 'home' | 'away' | null;
  }
): Promise<TriggerResult[]> {
  const db = await getDb();
  if (!db) {
    console.warn('[SavingsTrigger] Database not available');
    return [];
  }
  
  try {
    let match = matchData;
    if (!match) {
      const matchResult = await db
        .select()
        .from(matches)
        .where(eq(matches.id, matchId))
        .limit(1);
      
      if (!matchResult[0]) {
        console.warn(`[SavingsTrigger] Match ${matchId} not found`);
        return [];
      }
      match = matchResult[0];
    }
    
    const result = calculateMatchResult(
      match.homeScore,
      match.awayScore,
      match.marinosSide
    );
    
    if (!result) {
      console.log(`[SavingsTrigger] Match ${matchId} has no valid result`);
      return [];
    }
    
    const attendees = await db
      .select()
      .from(userMatches)
      .where(and(
        eq(userMatches.matchId, matchId),
        eq(userMatches.status, 'attended')
      ));
    
    if (attendees.length === 0) {
      console.log(`[SavingsTrigger] No attendees for match ${matchId}`);
      return [];
    }
    
    const results: TriggerResult[] = [];
    
    for (const attendee of attendees) {
      const userOpenId = await getUserOpenIdFromUserId(db, attendee.userId);
      if (!userOpenId) continue;
      
      const rules = await db
        .select()
        .from(savingsRules)
        .where(and(
          eq(savingsRules.userId, userOpenId),
          eq(savingsRules.enabled, true)
        ));
      
      const triggeredRules = rules.filter(rule => rule.condition === result);
      
      for (const rule of triggeredRules) {
        const existingHistory = await db
          .select()
          .from(savingsHistory)
          .where(and(
            eq(savingsHistory.userId, userOpenId),
            eq(savingsHistory.matchId, matchId),
            eq(savingsHistory.ruleId, rule.id)
          ))
          .limit(1);
        
        if (existingHistory.length > 0) {
          console.log(`[SavingsTrigger] Rule ${rule.id} already triggered for user ${userOpenId}, match ${matchId}`);
          continue;
        }
        
        await db.insert(savingsHistory).values({
          userId: userOpenId,
          ruleId: rule.id,
          matchId: matchId,
          condition: rule.condition,
          amount: rule.amount,
        });
      }
      
      const totalAmount = triggeredRules.reduce((sum, r) => sum + r.amount, 0);
      
      results.push({
        userId: userOpenId,
        matchId,
        triggered: triggeredRules.length > 0,
        rulesTriggered: triggeredRules.length,
        totalAmount,
      });
      
      if (triggeredRules.length > 0) {
        console.log(`[SavingsTrigger] Triggered ${triggeredRules.length} rules for user ${userOpenId}, match ${matchId}, total: ¥${totalAmount}`);
      }
    }
    
    return results;
  } catch (error) {
    console.error('[SavingsTrigger] Error:', error);
    return [];
  }
}

async function getUserOpenIdFromUserId(db: any, userId: number): Promise<string | null> {
  try {
    const { users } = await import('../drizzle/schema');
    const result = await db
      .select({ openId: users.openId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return result[0]?.openId || null;
  } catch {
    return null;
  }
}

export async function triggerSavingsForNewResults(
  beforeMatchIds: number[],
  beforeIsResults: Map<number, number>
): Promise<TriggerResult[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const currentMatches = await db
      .select()
      .from(matches)
      .where(inArray(matches.id, beforeMatchIds));
    
    const newlyConfirmed = currentMatches.filter(match => {
      const wasResult = beforeIsResults.get(match.id) === 1;
      const isNowResult = match.isResult === 1;
      return !wasResult && isNowResult;
    });
    
    if (newlyConfirmed.length === 0) {
      return [];
    }
    
    console.log(`[SavingsTrigger] Found ${newlyConfirmed.length} newly confirmed matches`);
    
    const allResults: TriggerResult[] = [];
    for (const match of newlyConfirmed) {
      const results = await triggerSavingsForMatch(match.id, {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        marinosSide: match.marinosSide,
      });
      allResults.push(...results);
    }
    
    return allResults;
  } catch (error) {
    console.error('[SavingsTrigger] Error in triggerSavingsForNewResults:', error);
    return [];
  }
}
