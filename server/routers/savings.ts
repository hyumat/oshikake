/**
 * Issue #144: マリノス貯金機能 - tRPCルーター
 * 
 * 貯金ルールの管理と貯金履歴の記録
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { savingsRules, savingsHistory, matches } from '../../drizzle/schema';
import { eq, and, desc, inArray, sum } from 'drizzle-orm';

export const savingsRouter = router({
  /**
   * 貯金ルール一覧取得
   */
  listRules: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'データベースに接続できません' });
    }

    const rules = await db
      .select()
      .from(savingsRules)
      .where(eq(savingsRules.userId, ctx.user.openId))
      .orderBy(desc(savingsRules.createdAt));
    
    return { rules };
  }),

  /**
   * 貯金ルール追加
   */
  addRule: protectedProcedure
    .input(z.object({
      condition: z.string().min(1).max(256),
      amount: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'データベースに接続できません' });
      }

      await db.insert(savingsRules).values({
        userId: ctx.user.openId,
        condition: input.condition,
        amount: input.amount,
        enabled: true,
      });
      
      return { success: true };
    }),

  /**
   * 貯金ルール削除
   */
  deleteRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'データベースに接続できません' });
      }

      const rules = await db
        .select()
        .from(savingsRules)
        .where(and(
          eq(savingsRules.id, input.id),
          eq(savingsRules.userId, ctx.user.openId)
        ))
        .limit(1);
      
      if (rules.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'ルールが見つかりません' });
      }
      
      await db.delete(savingsRules).where(eq(savingsRules.id, input.id));
      
      return { success: true };
    }),

  /**
   * 貯金ルール有効/無効切り替え
   */
  toggleRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'データベースに接続できません' });
      }

      const rules = await db
        .select()
        .from(savingsRules)
        .where(and(
          eq(savingsRules.id, input.id),
          eq(savingsRules.userId, ctx.user.openId)
        ))
        .limit(1);
      
      if (rules.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'ルールが見つかりません' });
      }

      const rule = rules[0];
      
      await db.update(savingsRules)
        .set({ enabled: !rule.enabled })
        .where(eq(savingsRules.id, input.id));
      
      return { success: true, enabled: !rule.enabled };
    }),

  /**
   * 貯金履歴取得
   */
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'データベースに接続できません' });
      }

      const history = await db
        .select()
        .from(savingsHistory)
        .where(eq(savingsHistory.userId, ctx.user.openId))
        .orderBy(desc(savingsHistory.triggeredAt))
        .limit(input.limit);
      
      // 試合IDを収集して一括取得（N+1クエリ対策）
      const matchIds = history
        .map(item => item.matchId)
        .filter((id): id is number => id !== null);
      
      let matchMap: Map<number, typeof matches.$inferSelect> = new Map();
      if (matchIds.length > 0) {
        const matchResults = await db
          .select()
          .from(matches)
          .where(inArray(matches.id, matchIds));
        matchMap = new Map(matchResults.map(m => [m.id, m]));
      }
      
      const historyWithMatches = history.map(item => ({
        ...item,
        match: item.matchId ? matchMap.get(item.matchId) || null : null,
      }));
      
      return { history: historyWithMatches };
    }),

  /**
   * 累計貯金額取得
   */
  getTotalSavings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'データベースに接続できません' });
    }

    const result = await db
      .select({ total: sum(savingsHistory.amount) })
      .from(savingsHistory)
      .where(eq(savingsHistory.userId, ctx.user.openId));
    
    const total = Number(result[0]?.total) || 0;
    
    return { total };
  }),

  /**
   * 試合結果に基づいて貯金をトリガー
   * 
   * @param matchId - 試合ID
   * @param result - 試合結果 ('勝利', '引き分け', '敗北')
   * @param scorers - 得点者リスト (オプション)
   */
  triggerSavings: protectedProcedure
    .input(z.object({
      matchId: z.number(),
      result: z.enum(['勝利', '引き分け', '敗北']),
      scorers: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'データベースに接続できません' });
      }

      // 有効なルールを取得
      const rules = await db
        .select()
        .from(savingsRules)
        .where(and(
          eq(savingsRules.userId, ctx.user.openId),
          eq(savingsRules.enabled, true)
        ));
      
      const triggeredRules = [];
      
      for (const rule of rules) {
        let matched = false;
        
        // 試合結果のチェック
        if (rule.condition === input.result) {
          matched = true;
        }
        
        // 得点者のチェック
        if (input.scorers && input.scorers.length > 0) {
          for (const scorer of input.scorers) {
            if (
              rule.condition.includes(scorer) || 
              rule.condition === `${scorer}得点`
            ) {
              matched = true;
              break;
            }
          }
        }
        
        if (matched) {
          triggeredRules.push(rule);
        }
      }
      
      // 貯金履歴に追加
      for (const rule of triggeredRules) {
        await db.insert(savingsHistory).values({
          userId: ctx.user.openId,
          ruleId: rule.id,
          matchId: input.matchId,
          condition: rule.condition,
          amount: rule.amount,
        });
      }
      
      const totalAmount = triggeredRules.reduce((sum, r) => sum + r.amount, 0);
      
      return {
        triggered: triggeredRules.length > 0,
        rules: triggeredRules,
        totalAmount,
        message: triggeredRules.length > 0
          ? `${triggeredRules.map(r => r.condition).join('、')}により ${totalAmount}円の貯金です！`
          : '該当するルールがありませんでした',
      };
    }),

  /**
   * テスト用: 試合データを送信して貯金をトリガー
   */
  testTrigger: protectedProcedure
    .input(z.object({
      result: z.enum(['勝利', '引き分け', '敗北']),
      scorers: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'データベースに接続できません' });
      }

      // 有効なルールを取得
      const rules = await db
        .select()
        .from(savingsRules)
        .where(and(
          eq(savingsRules.userId, ctx.user.openId),
          eq(savingsRules.enabled, true)
        ));
      
      const triggeredRules = [];
      
      for (const rule of rules) {
        let matched = false;
        
        // 試合結果のチェック
        if (rule.condition === input.result) {
          matched = true;
        }
        
        // 得点者のチェック
        if (input.scorers && input.scorers.length > 0) {
          for (const scorer of input.scorers) {
            if (
              rule.condition.includes(scorer) || 
              rule.condition === `${scorer}得点`
            ) {
              matched = true;
              break;
            }
          }
        }
        
        if (matched) {
          triggeredRules.push(rule);
        }
      }
      
      // テスト用なので実際には履歴に追加しない
      const totalAmount = triggeredRules.reduce((sum, r) => sum + r.amount, 0);
      
      return {
        triggered: triggeredRules.length > 0,
        rules: triggeredRules,
        totalAmount,
        message: triggeredRules.length > 0
          ? `${triggeredRules.map(r => r.condition).join('、')}により ${totalAmount}円の貯金です！`
          : '該当するルールがありませんでした',
      };
    }),
});
