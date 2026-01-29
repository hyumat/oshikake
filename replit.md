# オシカケ (Oshikake)

## Overview
オシカケは、Jリーグサポーター向けのWebアプリケーションです。ユーザーは応援するクラブを選択し（J1/J2対応）、観戦した公式試合の記録、交通費、チケット代、飲食費などの費用を追跡できます。本サービスは、観戦記録から得られる勝敗、費用合計、平均費用などの統計データを提供し、観戦体験の振り返りと費用管理をサポートすることを目的としています。
**Product Principles:**
1. Focus on "match records" and "cost records related to watching matches".
2. Ability to view "match results" and "match schedules" in one place for review.
3. Consolidate notes, photos, travel, accommodation, and expenses into "one match summary" rather than just attended/not attended.
4. Enable comfortable review later (search, sort, aggregate, export).

## User Preferences
特にありません。

## System Architecture
### UI/UX Decisions
- **Color Scheme**: Utilizes the Marinos tricolor (blue, white, red) with blue as the primary color and red for minimal accents.
- **Mobile-First Design**: Ensures responsiveness across all devices.
- **Component Library**: Based on `shadcn/ui` for a consistent and modern aesthetic.
- **Design Refresh**: Landing Page features scroll animations (`FadeInSection`) and an 8pt spacing rule.
- **Image Assets**: Custom-created, text-free images for the landing page (`lp-hero.png`, `lp-pain.png`, `lp-step-1/2/3.png`, `lp-stats.png`, `lp-future.png`).
- **Icons**: Comprehensive set of favicons and PWA icons.

### Technical Implementations
- **Frontend**: Built with React 19, Vite 7, and TailwindCSS 4, featuring pages for Home, Matches, MatchDetail, Landing, Account, Settings, and reusable UI components with a tRPC client.
- **Backend**: Uses Express and tRPC for server infrastructure (authentication, Vite middleware), API endpoints, and database operations.
- **Database**: PostgreSQL with Drizzle ORM, including tables for `users`, `matches`, `userMatches`, `matchExpenses`, `savingsRules`, `savingsHistory`, `syncLogs`, `auditLogs`, `eventLogs`, `announcements`, and `shareTokens`.
- **Shared Utilities**: A `shared/` directory for client and server types and utilities, including DTOs and formatters.
- **Billing System**: Implements a 3-tier (Free/Plus/Pro) subscription model with Stripe integration for checkout, portal sessions, and webhooks, including entitlement and plan limit management.
- **Match Data Management**: Stores attendance and expense data, retrieves official match data from external sources via `unified-scraper.ts`, normalizes `matchUrl`, generates `matchKey`, and tracks sync logs.
- **Statistics Module**: Provides APIs for calculating and displaying attendance counts, win/draw/loss records, total expenses, and average expenses per match, with year-based filtering.
- **User Authentication**: OAuth-only via Passport.js (Google only for launch, Apple coming soon), with JWT session management stored in HttpOnly cookies. Supports `returnTo` for post-login redirects.
- **Error Handling**: Standardized error display using `TRPCError` (e.g., `LIMIT_REACHED` for plan restrictions) and unified presentation via `QueryState` components.
- **Security**: Helmet for security headers, rate limiting on /api/trpc (100/15min), /api/auth/* (10/15min), /api/stripe/webhook (50/15min), trust proxy configuration for Replit environment.
- **Webhook Handling**: Stripe webhook signature verification, idempotency with event cache (max 1000 events), detailed error logging with event_id and timestamp.
- **Deployment**: Configured for Replit environment.

### Feature Specifications
- **Attendance Logging**: Users can record attended matches and detailed expenses (transportation, tickets, food, other).
- **Match Display**: Distinguishes between past and future matches, shows color-coded HOME/AWAY badges, tournament/section info, and Google Maps links.
- **Statistics Dashboard**: Displays aggregated data (total matches, WDL record, total/average cost) with year filtering.
- **Subscription Plans**: Free, Plus, and Pro plans with varying limits and access to advanced features (e.g., export, multi-season stats, priority support).
- **Landing Page**: Explains service, includes FAQs, and a pricing comparison table.
- **UX Improvements**: Enhanced attendance form with validation, improved error display, responsive mobile design, and asynchronous data synchronization with loading/toast notifications.
- **Admin Management**: Admin users can manage match data directly via `/admin/matches` without Spreadsheet dependency. CRUD operations for matches with search and pagination. Supports CSV and Excel (.xlsx/.xls) import/export with attendance field. Features a "Missing Fields" column showing which data is incomplete (KO, 会場, 大会, 結果, 観客) with auto-fill button to fetch data from external sources for empty fields only (does not overwrite existing data). Table columns are sortable (click header to cycle asc/desc/none) and reorderable via drag-and-drop with localStorage persistence.
- **Admin Dashboard UI** (#216): Admin-exclusive layout with dark sidebar navigation (ダッシュボード/試合データ管理/チーム管理) using slate-900 background and indigo accents. Dashboard displays modern stat cards for system status, progress bar visualization for data quality metrics, and hover-animated navigation cards. Gray-100 content area with white rounded-xl cards and subtle shadows.
- **Admin Operations Console**: Comprehensive admin dashboard at `/admin` with system status monitoring (DB connection, user/match counts, 24h errors), user plan management for billing recovery, announcements CRUD with type classification and date ranges, API performance monitoring (avg/p50/p95/p99, error rate, by-path stats), and event log viewer.
- **API Performance Logging**: In-memory metrics collection for all tRPC calls with automatic slow call warnings (>1000ms threshold).
- **Scraper Stabilization**: Retry logic with exponential backoff (up to 3 retries) for external data fetching, consistent timeout handling, and error collection.
- **Database Optimization**: Comprehensive indexing on frequently queried columns (userMatches, matches, syncLogs, auditLogs, eventLogs, matchExpenses) and N+1 query fixes in savings module.
- **Admin Monitoring**: SyncStatus and BillingStatus components on Home page for admins to monitor sync logs and billing events.
- **Ad Control**: AdBanner component hidden for Plus/Pro subscribers; Free users see ad placeholders.
- **Multi-Team Support**: Users select their supported J1/J2 club during onboarding via TeamSelect page. Matches are filtered by user's supportedTeamId. Settings page allows club change. Teams table has league column (J1/J2/null for J3). AuthGuard redirects users without supportedTeamId to /onboarding/team.
- **Savings Auto-Trigger**: Automatic savings rule triggers when match results are confirmed; prevents duplicate entries per (userId, matchId, ruleId) tuple.
- **Savings Notifications**: Recent triggers notification banner (24h) and one-time toast on Savings page load.
- **Frontend Performance Optimization** (v0.1.1): QueryClient caching (staleTime: 5min, gcTime: 30min, no refetch on window focus), memoized MatchCard component with React.memo, WebP images with lazy loading on Landing page.
- **v0.1.1 Stabilize Milestone** (Complete): Phase 1-5 completed including error handling standardization (QueryState), 192 passing tests, security hardening (Helmet, rate limiting), and production deployment configuration (autoscale).
- **Configuration Centralization** (#141): All server-side environment variables consolidated in `server/_core/config.ts` with typed access (env, server, auth, database, forge, GAS, Replit, logging, scheduler).
- **Dependency Cleanup** (#142): Removed unused packages (mysql2, node-ical, sharp, @types/express-rate-limit, add). Optimized icon imports using individual imports from lucide-react.
- **Stats API Optimization** (#134): Aggregation moved to PostgreSQL (CASE WHEN + COUNT/SUM), 60-second in-memory cache with automatic invalidation on data changes.
- **Plan Logic Consolidation** (#136): canUseFeature/shouldShowAds/getPlanDisplayName unified in `shared/billing.ts` with Feature type. Removed redundant `server/lib/planHelpers.ts`.
- **Share URL Feature** (#18): Users can create shareable links for their match statistics. Token-based public URLs at `/share/:token` display aggregated stats (watch count, W/D/L record, costs) without requiring login. Supports year filtering, enable/disable toggle, and expiration. ShareModal component on Stats page for link management.

### Documentation
- **MVP User Flow** (`docs/mvp-user-flow.md`): Defines the MVP user journey, screen list, and plan features.
- **MVP Checklist** (`docs/mvp-checklist.md`): Release readiness checklist (DoD) for MVP launch.
- **Privacy Policy** (`docs/legal-privacy.md`): Includes security design, authentication, and k-anonymity for future aggregation features.
- **Terms of Service** (`docs/legal-terms.md`): Includes data security provisions.

## External Dependencies
- **Database**: PostgreSQL (Replit built-in)
- **Payment Gateway**: Stripe
- **Frontend Framework**: React
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **ORM**: Drizzle ORM
- **API Layer**: tRPC
- **Server Framework**: Express
- **Package Manager**: pnpm
- **Analytics**: Optional (via `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID`)