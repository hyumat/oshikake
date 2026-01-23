import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { matchesRouter } from "./routers/matches";
import { userMatchesRouter } from "./routers/userMatches";
import { statsRouter } from "./routers/stats";
import { expensesRouter } from "./routers/expenses";
import { billingRouter } from "./routers/billing";
import { savingsRouter } from "./routers/savings";
import { adminRouter } from "./routers/admin";
import { usersRouter } from "./routers/users";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  matches: matchesRouter,
  userMatches: userMatchesRouter,
  stats: statsRouter,
  expenses: expensesRouter,
  billing: billingRouter,
  savings: savingsRouter,
  admin: adminRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
