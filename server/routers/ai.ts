import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { invokeLLM, type Message } from '../_core/llm';
import { getUserMatches, getUserPlan } from '../db';

export const aiRouter = router({
  /**
   * Issue #112: AI Dashboard Chat
   * Allows users to ask questions about their match attendance data
   */
  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(['system', 'user', 'assistant']),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id;

        // Get user's match attendance data for context
        const matches = await getUserMatches(userId, { status: 'attended' });
        const { plan } = await getUserPlan(userId);

        // Build system message with user context
        const watchCount = matches.length;
        const systemMessage: Message = {
          role: 'system',
          content: `あなたは横浜F・マリノスの観戦記録を分析するAIアシスタントです。

ユーザー情報:
- プラン: ${plan}
- 総観戦試合数: ${watchCount}試合

ユーザーの観戦データに基づいて、質問に答えてください。
統計、トレンド、推奨事項など、有用な情報を提供してください。
回答は日本語で、親しみやすく、具体的にお願いします。`,
        };

        // Combine system message with user's conversation
        const allMessages: Message[] = [systemMessage, ...input.messages];

        // Invoke LLM
        const result = await invokeLLM({
          messages: allMessages,
          maxTokens: 2048,
        });

        const assistantMessage = result.choices[0]?.message?.content;

        if (!assistantMessage || typeof assistantMessage !== 'string') {
          throw new Error('Invalid LLM response format');
        }

        return {
          success: true,
          content: assistantMessage,
          usage: result.usage,
        };
      } catch (error) {
        console.error('[AI Router] Chat error:', error);
        if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
          return {
            success: false,
            content: 'AI機能は現在利用できません。API設定を確認してください。',
          };
        }
        throw error;
      }
    }),
});
