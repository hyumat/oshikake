# オシカケ (Oshikake)

## Overview
オシカケは、横浜F・マリノスのサポーターに特化したWebアプリケーションです。ユーザーは観戦した公式試合の記録、交通費、チケット代、飲食費などの費用を追跡できます。本サービスは、観戦記録から得られる勝敗、費用合計、平均費用などの統計データを提供し、観戦体験の振り返りと費用管理をサポートすることを目的としています。
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
- **Frontend**: Built with React 19, Vite 7, and TailwindCSS 4, featuring pages for Home, Matches, MatchDetail, Landing, and reusable UI components with a tRPC client.
- **Backend**: Uses Express and tRPC for server infrastructure (authentication, Vite middleware), API endpoints, and database operations.
- **Database**: PostgreSQL with Drizzle ORM, including tables for `users`, `matches`, `userMatches`, `matchExpenses`, `savingsRules`, `savingsHistory`, `syncLogs`, `auditLogs`, `eventLogs`, and `announcements`.
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
- **Admin Management**: Admin users can manage match data directly via `/admin/matches` without Spreadsheet dependency. CRUD operations for matches with search and pagination.
- **Admin Operations Console**: Comprehensive admin dashboard at `/admin` with system status monitoring (DB connection, user/match counts, 24h errors), user plan management for billing recovery, announcements CRUD with type classification and date ranges, API performance monitoring (avg/p50/p95/p99, error rate, by-path stats), and event log viewer.
- **API Performance Logging**: In-memory metrics collection for all tRPC calls with automatic slow call warnings (>1000ms threshold).
- **Scraper Stabilization**: Retry logic with exponential backoff (up to 3 retries) for external data fetching, consistent timeout handling, and error collection.
- **Database Optimization**: Comprehensive indexing on frequently queried columns (userMatches, matches, syncLogs, auditLogs, eventLogs, matchExpenses) and N+1 query fixes in savings module.
- **Admin Monitoring**: SyncStatus and BillingStatus components on Home page for admins to monitor sync logs and billing events.

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