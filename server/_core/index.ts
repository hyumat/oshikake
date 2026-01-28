import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook } from "../webhookHandler";
import { startScheduledJobs } from "../scheduler";
import { config } from "./config";

const apiLimiter = rateLimit({
  windowMs: config.logging.rateLimiting.api.windowMs,
  max: config.logging.rateLimiting.api.max,
  message: { error: "リクエスト回数が制限を超えました。しばらく待ってから再試行してください。" },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: config.logging.rateLimiting.auth.windowMs,
  max: config.logging.rateLimiting.auth.max,
  message: { error: "認証試行回数が制限を超えました。しばらく待ってから再試行してください。" },
  standardHeaders: true,
  legacyHeaders: false,
});

const webhookLimiter = rateLimit({
  windowMs: config.logging.rateLimiting.webhook.windowMs,
  max: config.logging.rateLimiting.webhook.max,
  message: { error: "Webhook rate limit exceeded" },
  standardHeaders: true,
  legacyHeaders: false,
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy for rate limiting behind reverse proxy (Replit)
  app.set('trust proxy', 1);

  // Security headers (Helmet)
  app.use(helmet({
    contentSecurityPolicy: config.env.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // Stripe webhook route - MUST be registered BEFORE express.json()
  // Rate limited separately
  app.post(
    '/api/stripe/webhook',
    webhookLimiter,
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];
      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature' });
      }
      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;
        const result = await handleStripeWebhook(req.body as Buffer, sig);
        res.status(200).json(result);
      } catch (error: any) {
        console.error('[Webhook] Error:', error.message);
        res.status(400).json({ error: 'Webhook processing error' });
      }
    }
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Rate limit for auth routes
  app.use("/api/auth", authLimiter);
  app.use("/api/oauth", authLimiter);
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Rate limit and tRPC API
  app.use(
    "/api/trpc",
    apiLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (config.env.isDevelopment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = config.server.port;
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
    startScheduledJobs();
  });
}

startServer().catch(console.error);
