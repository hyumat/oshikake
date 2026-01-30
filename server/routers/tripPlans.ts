/**
 * Issue #203: 遠征プラン (Trip Plans) tRPC Router
 *
 * 交通・宿泊・立ち寄りスポットの事前メモを試合ごとに CRUD する。
 * データは本人のみ閲覧可能（プライバシー保護）。
 */

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import {
  tripPlanTransports,
  tripPlanLodgings,
  tripPlanSpots,
} from '../../drizzle/schema';

// ─── Zod input schemas ────────────────────────────────────────

const transportInput = z.object({
  matchId: z.number(),
  direction: z.enum(['outbound', 'return']),
  method: z.enum(['shinkansen', 'airplane', 'car', 'bus', 'local_train', 'ferry', 'other']),
  departureTime: z.string().max(16).optional(),
  arrivalTime: z.string().max(16).optional(),
  departurePlace: z.string().max(128).optional(),
  arrivalPlace: z.string().max(128).optional(),
  reservationUrl: z.string().max(512).optional(),
  note: z.string().max(512).optional(),
});

const lodgingInput = z.object({
  matchId: z.number(),
  stayOvernight: z.boolean(),
  hotelName: z.string().max(256).optional(),
  checkIn: z.string().max(16).optional(),
  checkOut: z.string().max(16).optional(),
  reservationUrl: z.string().max(512).optional(),
  budgetYen: z.number().min(0).optional(),
  note: z.string().max(512).optional(),
});

const spotInput = z.object({
  matchId: z.number(),
  spotName: z.string().min(1).max(256),
  tag: z.enum(['tourism', 'dining', 'onsen', 'landmark', 'merchandise', 'other']).optional(),
  visitTime: z.string().max(16).optional(),
  url: z.string().max(512).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  note: z.string().max(512).optional(),
});

// ─── Helper ───────────────────────────────────────────────────

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  }
  return db;
}

// ─── Router ───────────────────────────────────────────────────

export const tripPlansRouter = router({
  // ────── 一括取得 ──────
  /**
   * 試合に紐づく全プランを取得（交通・宿泊・スポット）
   */
  getAll: protectedProcedure
    .input(z.object({ matchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const where = (table: typeof tripPlanTransports | typeof tripPlanLodgings | typeof tripPlanSpots) =>
        and(eq(table.userId, userId), eq(table.matchId, input.matchId));

      const [transports, lodgings, spots] = await Promise.all([
        db.select().from(tripPlanTransports).where(where(tripPlanTransports)),
        db.select().from(tripPlanLodgings).where(where(tripPlanLodgings)),
        db.select().from(tripPlanSpots).where(where(tripPlanSpots)),
      ]);

      return { success: true, transports, lodgings, spots };
    }),

  // ────── 交通 CRUD ──────
  addTransport: protectedProcedure
    .input(transportInput)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db.insert(tripPlanTransports).values({
        userId: ctx.user.id,
        matchId: input.matchId,
        direction: input.direction,
        method: input.method,
        departureTime: input.departureTime ?? null,
        arrivalTime: input.arrivalTime ?? null,
        departurePlace: input.departurePlace ?? null,
        arrivalPlace: input.arrivalPlace ?? null,
        reservationUrl: input.reservationUrl ?? null,
        note: input.note ?? null,
      }).returning({ id: tripPlanTransports.id });
      return { success: true, id: row.id };
    }),

  updateTransport: protectedProcedure
    .input(z.object({ id: z.number() }).merge(transportInput.partial().omit({ matchId: true })))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (data.direction !== undefined) set.direction = data.direction;
      if (data.method !== undefined) set.method = data.method;
      if (data.departureTime !== undefined) set.departureTime = data.departureTime ?? null;
      if (data.arrivalTime !== undefined) set.arrivalTime = data.arrivalTime ?? null;
      if (data.departurePlace !== undefined) set.departurePlace = data.departurePlace ?? null;
      if (data.arrivalPlace !== undefined) set.arrivalPlace = data.arrivalPlace ?? null;
      if (data.reservationUrl !== undefined) set.reservationUrl = data.reservationUrl ?? null;
      if (data.note !== undefined) set.note = data.note ?? null;

      await db.update(tripPlanTransports)
        .set(set)
        .where(and(eq(tripPlanTransports.id, id), eq(tripPlanTransports.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteTransport: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.delete(tripPlanTransports)
        .where(and(eq(tripPlanTransports.id, input.id), eq(tripPlanTransports.userId, ctx.user.id)));
      return { success: true };
    }),

  // ────── 宿泊 CRUD ──────
  addLodging: protectedProcedure
    .input(lodgingInput)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db.insert(tripPlanLodgings).values({
        userId: ctx.user.id,
        matchId: input.matchId,
        stayOvernight: input.stayOvernight,
        hotelName: input.hotelName ?? null,
        checkIn: input.checkIn ?? null,
        checkOut: input.checkOut ?? null,
        reservationUrl: input.reservationUrl ?? null,
        budgetYen: input.budgetYen ?? null,
        note: input.note ?? null,
      }).returning({ id: tripPlanLodgings.id });
      return { success: true, id: row.id };
    }),

  updateLodging: protectedProcedure
    .input(z.object({ id: z.number() }).merge(lodgingInput.partial().omit({ matchId: true })))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (data.stayOvernight !== undefined) set.stayOvernight = data.stayOvernight;
      if (data.hotelName !== undefined) set.hotelName = data.hotelName ?? null;
      if (data.checkIn !== undefined) set.checkIn = data.checkIn ?? null;
      if (data.checkOut !== undefined) set.checkOut = data.checkOut ?? null;
      if (data.reservationUrl !== undefined) set.reservationUrl = data.reservationUrl ?? null;
      if (data.budgetYen !== undefined) set.budgetYen = data.budgetYen ?? null;
      if (data.note !== undefined) set.note = data.note ?? null;

      await db.update(tripPlanLodgings)
        .set(set)
        .where(and(eq(tripPlanLodgings.id, id), eq(tripPlanLodgings.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteLodging: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.delete(tripPlanLodgings)
        .where(and(eq(tripPlanLodgings.id, input.id), eq(tripPlanLodgings.userId, ctx.user.id)));
      return { success: true };
    }),

  // ────── スポット CRUD ──────
  addSpot: protectedProcedure
    .input(spotInput)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db.insert(tripPlanSpots).values({
        userId: ctx.user.id,
        matchId: input.matchId,
        spotName: input.spotName,
        tag: input.tag ?? null,
        visitTime: input.visitTime ?? null,
        url: input.url ?? null,
        priority: input.priority ?? 'medium',
        note: input.note ?? null,
      }).returning({ id: tripPlanSpots.id });
      return { success: true, id: row.id };
    }),

  updateSpot: protectedProcedure
    .input(z.object({ id: z.number() }).merge(spotInput.partial().omit({ matchId: true })))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (data.spotName !== undefined) set.spotName = data.spotName;
      if (data.tag !== undefined) set.tag = data.tag ?? null;
      if (data.visitTime !== undefined) set.visitTime = data.visitTime ?? null;
      if (data.url !== undefined) set.url = data.url ?? null;
      if (data.priority !== undefined) set.priority = data.priority ?? 'medium';
      if (data.note !== undefined) set.note = data.note ?? null;

      await db.update(tripPlanSpots)
        .set(set)
        .where(and(eq(tripPlanSpots.id, id), eq(tripPlanSpots.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteSpot: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.delete(tripPlanSpots)
        .where(and(eq(tripPlanSpots.id, input.id), eq(tripPlanSpots.userId, ctx.user.id)));
      return { success: true };
    }),
});
