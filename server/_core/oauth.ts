import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { config } from "./config";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

const DEV_TEST_USERS: Record<string, { openId: string; name: string }> = {
  admin: { openId: "test-admin-001", name: "管理者ユーザー" },
  plus: { openId: "test-plus-001", name: "Plusユーザー" },
  pro: { openId: "test-pro-001", name: "Proユーザー" },
  free: { openId: "test-free-001", name: "Freeユーザー" },
};

export function registerOAuthRoutes(app: Express) {
  if (config.env.isDevelopment) {
    app.get("/api/dev/switch-user/:userType", async (req: Request, res: Response) => {
      const userType = req.params.userType as keyof typeof DEV_TEST_USERS;
      const testUser = DEV_TEST_USERS[userType];

      if (!testUser) {
        res.status(400).json({
          error: "Invalid user type",
          available: Object.keys(DEV_TEST_USERS),
        });
        return;
      }

      try {
        let user = await db.getUserByOpenId(testUser.openId);
        if (!user) {
          const role = userType === "admin" ? "admin" : "user";
          await db.upsertUser({
            openId: testUser.openId,
            name: testUser.name,
            email: `${userType}@test.example.com`,
            loginMethod: "dev",
            role,
            lastSignedIn: new Date(),
          });
          user = await db.getUserByOpenId(testUser.openId);
          console.log(`[Dev] Created test user: ${userType}`);
        }

        const sessionToken = await sdk.createSessionToken(testUser.openId, {
          name: testUser.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        res.redirect(302, "/app");
      } catch (error) {
        console.error("[Dev] Switch user failed:", error);
        res.status(500).json({ error: "Failed to switch user" });
      }
    });

    app.get("/api/dev/users", (_req: Request, res: Response) => {
      res.json({
        message: "Development only - available test users",
        users: Object.entries(DEV_TEST_USERS).map(([type, data]) => ({
          type,
          ...data,
          switchUrl: `/api/dev/switch-user/${type}`,
        })),
      });
    });
  }
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      let redirectTo = "/app";
      try {
        const statePayload = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
        if (statePayload.returnTo && typeof statePayload.returnTo === "string") {
          const returnTo = statePayload.returnTo;
          if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
            redirectTo = returnTo;
          }
        }
      } catch {
        // fallback to default if state parsing fails
      }

      res.redirect(302, redirectTo);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
