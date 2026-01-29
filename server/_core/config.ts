/**
 * Server Configuration
 * 
 * All server-side environment variables and constants are centralized here.
 * This makes it easy to see what configuration is needed and where values come from.
 */

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
const isDevelopment = !isProduction && !isTest;

export const config = {
  env: {
    isProduction,
    isDevelopment,
    isTest,
    nodeEnv: process.env.NODE_ENV || "development",
  },

  server: {
    port: parseInt(process.env.PORT || "5000", 10),
    trustProxy: true,
  },

  auth: {
    appId: process.env.VITE_APP_ID || (isDevelopment ? "dev-oshikake-app" : ""),
    cookieSecret: process.env.SESSION_SECRET ?? process.env.JWT_SECRET ?? "",
    oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
    ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  },

  database: {
    url: process.env.DATABASE_URL ?? "",
  },

  forge: {
    apiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
    apiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  },

  gas: {
    apiUrl: process.env.GAS_API_URL ?? "",
    apiToken: process.env.GAS_API_TOKEN ?? "",
    get isConfigured(): boolean {
      return !!(this.apiUrl && this.apiToken);
    },
  },

  replit: {
    domains: process.env.REPLIT_DOMAINS ?? "",
    connectorsHostname: process.env.REPLIT_CONNECTORS_HOSTNAME ?? "",
    identity: process.env.REPL_IDENTITY ?? "",
    webReplRenewal: process.env.WEB_REPL_RENEWAL ?? "",
    isDeployment: process.env.REPLIT_DEPLOYMENT === "1",
    get baseUrl(): string {
      const domain = this.domains.split(",")[0];
      return domain ? `https://${domain}` : "http://localhost:5000";
    },
    get xReplitToken(): string {
      if (this.identity) return `repl ${this.identity}`;
      if (this.webReplRenewal) return `depl ${this.webReplRenewal}`;
      return "";
    },
  },

  logging: {
    verbose: isDevelopment,
    slowQueryThresholdMs: 1000,
    rateLimiting: {
      api: { windowMs: 15 * 60 * 1000, max: 100 },
      auth: { windowMs: 15 * 60 * 1000, max: 10 },
      webhook: { windowMs: 15 * 60 * 1000, max: 50 },
    },
  },

  scheduler: {
    syncCron: "0 0 * * *",
    timezone: "Asia/Tokyo",
  },
} as const;

export const ENV = {
  appId: config.auth.appId,
  cookieSecret: config.auth.cookieSecret,
  databaseUrl: config.database.url,
  oAuthServerUrl: config.auth.oAuthServerUrl,
  ownerOpenId: config.auth.ownerOpenId,
  isProduction: config.env.isProduction,
  forgeApiUrl: config.forge.apiUrl,
  forgeApiKey: config.forge.apiKey,
};
