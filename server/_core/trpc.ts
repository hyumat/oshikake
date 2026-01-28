import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

const SLOW_THRESHOLD_MS = 1000;
const MAX_METRICS = 1000;

interface ApiMetric {
  path: string;
  duration: number;
  timestamp: Date;
  userId?: number;
  status: 'success' | 'error';
}

const apiMetrics: ApiMetric[] = [];

export function getApiMetrics(limit = 100): ApiMetric[] {
  return apiMetrics.slice(-limit);
}

export function getApiPerformanceStats() {
  if (apiMetrics.length === 0) {
    return {
      totalCalls: 0,
      avgDuration: 0,
      p50Duration: 0,
      p95Duration: 0,
      p99Duration: 0,
      slowCalls: 0,
      errorRate: 0,
      byPath: {} as Record<string, { count: number; avgDuration: number; errorCount: number }>,
    };
  }

  const sorted = [...apiMetrics].sort((a, b) => a.duration - b.duration);
  const durations = sorted.map(m => m.duration);
  
  const errors = apiMetrics.filter(m => m.status === 'error').length;
  const slowCalls = apiMetrics.filter(m => m.duration > SLOW_THRESHOLD_MS).length;
  
  const byPath: Record<string, { count: number; totalDuration: number; errorCount: number }> = {};
  for (const m of apiMetrics) {
    if (!byPath[m.path]) {
      byPath[m.path] = { count: 0, totalDuration: 0, errorCount: 0 };
    }
    byPath[m.path].count++;
    byPath[m.path].totalDuration += m.duration;
    if (m.status === 'error') byPath[m.path].errorCount++;
  }

  const byPathStats = Object.fromEntries(
    Object.entries(byPath).map(([path, stats]) => [
      path,
      {
        count: stats.count,
        avgDuration: Math.round(stats.totalDuration / stats.count),
        errorCount: stats.errorCount,
      },
    ])
  );

  return {
    totalCalls: apiMetrics.length,
    avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    p50Duration: durations[Math.floor(durations.length * 0.5)] || 0,
    p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
    p99Duration: durations[Math.floor(durations.length * 0.99)] || 0,
    slowCalls,
    errorRate: Math.round((errors / apiMetrics.length) * 100 * 10) / 10,
    byPath: byPathStats,
  };
}

const logPerformance = t.middleware(async opts => {
  const { path, ctx, next } = opts;
  const start = performance.now();
  
  try {
    const result = await next();
    const duration = Math.round(performance.now() - start);
    
    apiMetrics.push({
      path,
      duration,
      timestamp: new Date(),
      userId: ctx.user?.id,
      status: 'success',
    });
    
    if (apiMetrics.length > MAX_METRICS) {
      apiMetrics.shift();
    }
    
    if (duration > SLOW_THRESHOLD_MS) {
      console.warn(`[API] Slow call: ${path} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    
    apiMetrics.push({
      path,
      duration,
      timestamp: new Date(),
      userId: ctx.user?.id,
      status: 'error',
    });
    
    if (apiMetrics.length > MAX_METRICS) {
      apiMetrics.shift();
    }
    
    throw error;
  }
});

export const router = t.router;

const baseProcedure = t.procedure.use(logPerformance);

export const publicProcedure = baseProcedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = baseProcedure.use(requireUser);

export const adminProcedure = baseProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
