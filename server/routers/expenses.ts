import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

const expenseCategoryEnum = z.enum(["transport", "ticket", "food", "other"]);

export const expensesRouter = router({
  getByUserMatch: protectedProcedure
    .input(z.object({ userMatchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const expenses = await db.getExpensesByUserMatch(input.userMatchId, ctx.user.id);
      return expenses;
    }),

  create: protectedProcedure
    .input(z.object({
      userMatchId: z.number(),
      category: expenseCategoryEnum,
      customCategoryId: z.number().optional(),
      amount: z.number().min(0),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.createExpense(ctx.user.id, {
        userMatchId: input.userMatchId,
        category: input.category,
        customCategoryId: input.customCategoryId,
        amount: input.amount,
        note: input.note ?? null,
      });

      await db.logEvent("expense_add", ctx.user.id, {
        category: input.category,
        customCategoryId: input.customCategoryId,
        amount: input.amount,
      });

      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      category: expenseCategoryEnum.optional(),
      customCategoryId: z.number().nullable().optional(),
      amount: z.number().min(0).optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateExpense(id, ctx.user.id, data);

      await db.logEvent("expense_update", ctx.user.id, {
        expenseId: id,
      });

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteExpense(input.id, ctx.user.id);

      await db.logEvent("expense_delete", ctx.user.id, {
        expenseId: input.id,
      });

      return { success: true };
    }),

  deleteAllByUserMatch: protectedProcedure
    .input(z.object({ userMatchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteExpensesByUserMatch(input.userMatchId, ctx.user.id);
      return { success: true };
    }),
});
