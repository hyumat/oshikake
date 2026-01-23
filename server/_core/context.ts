import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sessionManager } from "./session";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from 'cookie';
import { ENV } from "./env";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const DEV_USER_OPEN_ID = "dev-user-001";
const DEV_USER_NAME = "テストユーザー";

function createMockDevUser(): User {
  return {
    id: 1,
    openId: DEV_USER_OPEN_ID,
    name: DEV_USER_NAME,
    email: "dev@example.com",
    loginMethod: "dev",
    role: "user",
    myTeamSlug: "yokohama-f-marinos",
    plan: "free",
    planExpiresAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

async function getOrCreateDevUser(): Promise<User> {
  try {
    let user = await db.getUserByOpenId(DEV_USER_OPEN_ID);
    if (!user) {
      await db.upsertUser({
        openId: DEV_USER_OPEN_ID,
        name: DEV_USER_NAME,
        email: "dev@example.com",
        loginMethod: "dev",
        lastSignedIn: new Date(),
      });
      user = await db.getUserByOpenId(DEV_USER_OPEN_ID);
    }
    return user!;
  } catch (dbError) {
    console.log("[Auth] DB unavailable, using mock dev user");
    return createMockDevUser();
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Cookie からセッショントークン取得
    const cookies = parseCookieHeader(opts.req.headers.cookie || '');
    const sessionToken = cookies[COOKIE_NAME];

    if (sessionToken) {
      // セッション検証
      const session = await sessionManager.verifySession(sessionToken);

      if (session) {
        // ユーザー情報取得
        const fetchedUser = await db.getUserByOpenId(session.userId);
        user = fetchedUser ?? null;

        if (user) {
          // 最終ログイン時刻更新
          await db.upsertUser({
            openId: user.openId,
            lastSignedIn: new Date(),
          });
        }
      }
    }
  } catch (error) {
    console.error('[Auth] Authentication failed:', error);

    // 開発モードフォールバック
    if (!ENV.isProduction) {
      try {
        user = await getOrCreateDevUser();
        console.log("[Auth] Using dev fallback user:", user.name);
      } catch (devError) {
        console.error("[Auth] Failed to create dev user:", devError);
        user = null;
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
