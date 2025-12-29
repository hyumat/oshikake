# Marinos Away Log V2

## Overview
A Japanese-language web application for tracking Yokohama F. Marinos (J-League) match attendance. Users can log matches they've attended, track expenses (transportation, tickets, food), and view statistics about their match attendance history.

## Project Structure
- `client/` - React frontend with Vite
  - `src/pages/` - Page components (Home, Matches, MatchDetail, Landing)
  - `src/components/` - UI components (shadcn/ui based)
  - `src/lib/` - Utilities and tRPC client
- `server/` - Express backend with tRPC
  - `_core/` - Core server infrastructure (auth, Vite middleware, etc.)
  - `routers/` - tRPC routers for API endpoints
  - `db.ts` - Database operations with Drizzle ORM
- `drizzle/` - Database schema and migrations
- `shared/` - Shared types between client and server

## Tech Stack
- **Frontend**: React 19, Vite 7, TailwindCSS 4, shadcn/ui components
- **Backend**: Express, tRPC
- **Database**: MySQL via Drizzle ORM
- **Package Manager**: pnpm

## Running the Application
- Development: `pnpm run dev` (runs on port 5000)
- Build: `pnpm run build`
- Production: `pnpm run start`

## Environment Variables
- `DATABASE_URL` - MySQL connection string (required for database features)
- `SESSION_SECRET` - Session secret for authentication
- `VITE_ANALYTICS_ENDPOINT` - Optional analytics endpoint
- `VITE_ANALYTICS_WEBSITE_ID` - Optional analytics website ID

## Recent Changes
- 2025-12-29: Configured for Replit environment
  - Updated Vite config to allow all hosts for Replit proxy
  - Updated server to bind to 0.0.0.0:5000
  - Set up deployment configuration
