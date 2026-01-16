/**
 * Issue #144: マリノス貯金機能 - tRPCルーター
 * 
 * 貯金ルールの管理と貯金履歴の記録
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '../db';
import { savingsRules, savingsHistory, matches } from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export const savingsRouter = router({
  /**
   * 貯金ルール一覧取得
   */
  listRules: protectedProcedure.query(async ({ ctx }) => {
    const rules = await db.query.savingsRules.findMany({
      where: eq(savingsRules.userId, ctx.user.openId),
      orderBy: [desc(savingsRules.createdAt)],
    });
    
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
      const [rule] = await db.insert(savingsRules).values({
        userId: ctx.user.openId,
        condition: input.condition,
        amount: input.amount,
        enabled: true,
      });
      
      return { success: true, rule };
    }),

  /**
   * 貯金ルール削除
   */
  deleteRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // ルールの所有者確認
      const rule = await db.query.savingsRules.findFirst({
        where: and(
          eq(savingsRules.id, input.id),
          eq(savingsRules.userId, ctx.user.openId)
        ),
      });
      
      if (!rule) {
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
      // ルールの所有者確認
      const rule = await db.query.savingsRules.findFirst({
        where: and(
          eq(savingsRules.id, input.id),
          eq(savingsRules.userId, ctx.user.openId)
        ),
      });
      
      if (!rule) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'ルールが見つかりません' });
      }
      
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
      const history = await db.query.savingsHistory.findMany({
        where: eq(savingsHistory.userId, ctx.user.openId),
        orderBy: [desc(savingsHistory.triggeredAt)],
        limit: input.limit,
      });
      
      // 試合情報を取得
      const historyWithMatches = await Promise.all(
        history.map(async (item) => {
          if (!item.matchId) return { ...item, match: null };
          
          const match = await db.query.matches.findFirst({
            where: eq(matches.id, item.matchId),
          });
          
          return { ...item, match };
        })
      );
      
      return { history: historyWithMatches };
    }),

  /**
   * 累計貯金額取得
   */
  getTotalSavings: protectedProcedure.query(async ({ ctx }) => {
    const history = await db.query.savingsHistory.findMany({
      where: eq(savingsHistory.userId, ctx.user.openId),
    });
    
    const total = history.reduce((sum, item) => sum + item.amount, 0);
    
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
      // 有効なルールを取得
      const rules = await db.query.savingsRules.findMany({
        where: and(
          eq(savingsRules.userId, ctx.user.openId),
          eq(savingsRules.enabled, true)
        ),
      });
      
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
      // 有効なルールを取得
      const rules = await db.query.savingsRules.findMany({
        where: and(
          eq(savingsRules.userId, ctx.user.openId),
          eq(savingsRules.enabled, true)
        ),
      });
      
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

  /**
   * 未処理の試合結果をチェックして自動的に貯金をトリガー
   *
   * ユーザーがアプリを開いたときや、Statsページを開いたときに自動実行
   * 既に貯金履歴に記録されている試合はスキップ
   */
  checkPendingSavings: protectedProcedure.query(async ({ ctx }) => {
    try {
      // 有効なルールを取得
      const rules = await db.query.savingsRules.findMany({
        where: and(
          eq(savingsRules.userId, ctx.user.openId),
          eq(savingsRules.enabled, true)
        ),
      });

      // ルールがない場合は何もしない
      if (rules.length === 0) {
        return {
          success: true,
          processed: 0,
          totalAmount: 0,
          newSavings: [],
        };
      }

      // 結果が確定している試合を取得
      const completedMatches = await db.query.matches.findMany({
        where: eq(matches.isResult, 1),
      });

      // 既に貯金履歴に記録されている試合IDを取得
      const existingHistory = await db.query.savingsHistory.findMany({
        where: eq(savingsHistory.userId, ctx.user.openId),
      });

      const processedMatchIds = new Set(
        existingHistory.map((h) => h.matchId).filter((id): id is number => id !== null)
      );

      // 未処理の試合を抽出
      const pendingMatches = completedMatches.filter(
        (match) => match.id && !processedMatchIds.has(match.id)
      );

      const newSavings: Array<{
        matchId: number;
        matchDate: string;
        opponent: string;
        result: string;
        amount: number;
        conditions: string[];
      }> = [];

      // 各未処理試合に対して貯金をトリガー
      for (const match of pendingMatches) {
        if (match.homeScore === null || match.awayScore === null) continue;
        if (!match.id) continue;

        // 試合結果を判定
        let result: '勝利' | '引き分け' | '敗北';
        const marinosSide = match.marinosSide || 'home';
        const marinosScore = marinosSide === 'home' ? match.homeScore : match.awayScore;
        const opponentScore = marinosSide === 'home' ? match.awayScore : match.homeScore;

        if (marinosScore > opponentScore) {
          result = '勝利';
        } else if (marinosScore < opponentScore) {
          result = '敗北';
        } else {
          result = '引き分け';
        }

        const triggeredRules = [];

        // ルールをチェック
        for (const rule of rules) {
          if (rule.condition === result) {
            triggeredRules.push(rule);
          }
          // TODO: 得点者のチェック（将来実装）
        }

        // 貯金履歴に追加
        for (const rule of triggeredRules) {
          await db.insert(savingsHistory).values({
            userId: ctx.user.openId,
            ruleId: rule.id,
            matchId: match.id,
            condition: rule.condition,
            amount: rule.amount,
          });
        }

        if (triggeredRules.length > 0) {
          const matchAmount = triggeredRules.reduce((sum, r) => sum + r.amount, 0);
          newSavings.push({
            matchId: match.id,
            matchDate: match.date,
            opponent: match.opponent || '',
            result,
            amount: matchAmount,
            conditions: triggeredRules.map((r) => r.condition),
          });
        }
      }

      const totalAmount = newSavings.reduce((sum, s) => sum + s.amount, 0);

      return {
        success: true,
        processed: newSavings.length,
        totalAmount,
        newSavings,
        message:
          newSavings.length > 0
            ? `${newSavings.length}件の試合で ${totalAmount}円の貯金が追加されました！`
            : '新しい貯金はありませんでした',
      };
    } catch (error) {
      console.error('[Savings Router] checkPendingSavings error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: '貯金チェック中にエラーが発生しました',
      });
    }
  }),
});
