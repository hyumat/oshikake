import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
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
    plan: "free",
    planExpiresAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    supportedTeamId: null,
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
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication failed - user remains null
    // In development, use /api/dev/switch-user/:type to login as test users
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

// Export for use in dev switch-user endpoint
export { getOrCreateDevUser };
