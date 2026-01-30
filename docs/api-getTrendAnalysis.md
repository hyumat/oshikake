# getTrendAnalysis API Documentation

**Issue**: #80
**Related**: Issue #111 (MatchInsights page)
**Status**: ✅ Implemented (PR #191)

## Overview

`getTrendAnalysis` is a Pro-only tRPC endpoint that provides aggregated expense data for a specific match, showing trends from other users' planned expenses. The API implements k-anonymity to protect user privacy.

## Endpoint

```typescript
trpc.userMatches.getTrendAnalysis.useQuery({ matchId: number })
```

## Access Control

- **Authentication**: Required (protectedProcedure)
- **Plan Restriction**: Pro-only feature
- **User Filtering**: Excludes current user's data from aggregation

## Privacy Protection: k-Anonymity

The API implements **k-anonymity** with k=5, meaning:
- Minimum **5 users** must have planned expenses for a match
- If less than 5 users, returns `hasData: false` with message
- Current user's data is always excluded from aggregation

This ensures individual users cannot be identified from the aggregated data.

## Request

### Input Schema

```typescript
{
  matchId: number  // Required: ID of the match to analyze
}
```

### Example Request

```typescript
const { data, isLoading } = trpc.userMatches.getTrendAnalysis.useQuery(
  { matchId: 123 },
  { enabled: isPro }  // Only fetch when user is Pro
);
```

## Response

The API returns one of three response types:

### 1. Success with Data (hasData: true)

Returned when ≥5 users have planned expenses.

```typescript
{
  success: true,
  hasData: true,
  recordCount: number,  // Number of users included (≥5)
  categories: {
    transport: {
      average: number,    // Average amount spent on transport
      min: number,        // Minimum amount
      max: number,        // Maximum amount
      userCount: number   // Number of users with transport expenses
    },
    ticket: { /* same structure */ },
    food: { /* same structure */ },
    other: { /* same structure */ }
  },
  budgetDistribution: [
    {
      range: string,  // e.g., "0-5000", "5000-10000", "10000-15000", "15000-20000", "20000+"
      count: number   // Number of users in this budget range
    },
    // ... more ranges
  ]
}
```

### 2. Insufficient Data (hasData: false)

Returned when <5 users have planned expenses (k-anonymity protection).

```typescript
{
  success: true,
  hasData: false,
  message: "プライバシー保護のため、5人以上のデータが必要です（現在: 3人）",
  recordCount: number,    // Current number of users (<5)
  requiredCount: 5        // Minimum required users
}
```

### 3. Error Response

Returned when database is unavailable or an error occurs.

```typescript
{
  success: false,
  message: string,  // Error message
  hasData: false
}
```

## Implementation Details

### Data Selection

The API queries `userMatches` and `matchExpenses` tables with the following filters:

1. **Match Filter**: `matchId = input.matchId`
2. **Status Filter**: `status = 'planned'` (only planned matches, not attended)
3. **User Exclusion**: `userId != ctx.user.id` (exclude current user)

### Category Aggregation

For each category (transport, ticket, food, other):
- Calculate **average** (mean of all non-zero expenses)
- Find **minimum** (lowest non-zero expense)
- Find **maximum** (highest expense)
- Count **userCount** (users with expenses in this category)

### Budget Distribution

Total expenses per user are grouped into ranges:
- `0-5000`: ¥0 - ¥5,000
- `5000-10000`: ¥5,000 - ¥10,000
- `10000-15000`: ¥10,000 - ¥15,000
- `15000-20000`: ¥15,000 - ¥20,000
- `20000+`: ¥20,000+

## Usage Example

### Frontend Component (MatchInsights.tsx)

```typescript
import { trpc } from '@/lib/trpc';

function MatchInsights() {
  const matchId = 123;

  // Check if user is Pro
  const { data: planStatus } = trpc.userMatches.getPlanStatus.useQuery();
  const isPro = planStatus?.isPro ?? false;

  // Fetch trend analysis data
  const { data: trendData, isLoading } = trpc.userMatches.getTrendAnalysis.useQuery(
    { matchId },
    { enabled: isPro }
  );

  // Display loading state
  if (isLoading) {
    return <div>データを読み込み中...</div>;
  }

  // Handle insufficient data (k-anonymity)
  if (trendData && !trendData.hasData) {
    return (
      <div>
        <h3>データが不足しています</h3>
        <p>{trendData.message}</p>
        {trendData.recordCount !== undefined && (
          <p>現在: {trendData.recordCount}人 / 必要: {trendData.requiredCount}人</p>
        )}
      </div>
    );
  }

  // Display trend data
  if (trendData?.hasData && trendData.categories) {
    return (
      <div>
        <h2>{trendData.recordCount}人の計画データを集計しています</h2>

        {/* Transport category */}
        {trendData.categories.transport?.userCount > 0 && (
          <div>
            <h3>交通費</h3>
            <p>平均: ¥{trendData.categories.transport.average.toLocaleString()}</p>
            <p>最小: ¥{trendData.categories.transport.min.toLocaleString()}</p>
            <p>最大: ¥{trendData.categories.transport.max.toLocaleString()}</p>
            <p>回答数: {trendData.categories.transport.userCount}人</p>
          </div>
        )}

        {/* Similar for other categories */}
      </div>
    );
  }

  return null;
}
```

## Database Schema

### userMatches Table

```sql
- id: integer (primary key)
- userId: integer (references users)
- matchId: integer (references matches)
- status: 'planned' | 'attended' | 'skipped'
- ... other fields
```

### matchExpenses Table

```sql
- id: integer (primary key)
- userMatchId: integer (references userMatches)
- category: string (transport, ticket, food, other, etc.)
- amount: integer (amount in yen)
- ... other fields
```

## Security Considerations

1. **k-Anonymity (k=5)**: Prevents individual identification
2. **User Exclusion**: Current user's data never included in aggregation
3. **Plan-based Filtering**: Only includes `status='planned'` matches
4. **Authentication Required**: Only logged-in users can access
5. **Pro-only Feature**: Frontend should gate access to Pro users

## Testing

### Unit Tests

Location: `server/routers/userMatches.test.ts`

Tests cover:
- ✅ Procedure definition
- ✅ Authentication requirement
- ✅ Input validation (matchId)
- ✅ Response structure validation
- ✅ k-anonymity enforcement (minimum 5 users)
- ✅ User exclusion from aggregation
- ✅ Status filtering (planned only)
- ✅ Category aggregation
- ✅ Budget distribution ranges

### Integration Tests

Location: `client/src/pages/MatchInsights.test.tsx`

Tests cover:
- ✅ Pro-only access control
- ✅ API call with correct matchId
- ✅ Loading state display
- ✅ Insufficient data message (k-anonymity)
- ✅ Trend data display
- ✅ Category data rendering

## Performance Considerations

### Query Optimization

1. **Indexed Fields**: Ensure `matchId`, `status`, `userId` are indexed
2. **Filtering**: Early filtering reduces data processing
3. **Aggregation**: Server-side aggregation reduces data transfer

### Caching Strategy

Consider implementing cache for:
- **Duration**: 5-15 minutes
- **Key**: `getTrendAnalysis:${matchId}`
- **Invalidation**: When new userMatch or matchExpense is created/updated

Example with React Query:

```typescript
const { data } = trpc.userMatches.getTrendAnalysis.useQuery(
  { matchId },
  {
    enabled: isPro,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 15 * 60 * 1000,  // 15 minutes
  }
);
```

## Future Enhancements

### Short-term
- [ ] Add graphical visualization of budget distribution
- [ ] Include comparison with user's own expenses
- [ ] Add filters by date range

### Medium-term
- [ ] Support for custom expense categories (Issue #109)
- [ ] Historical trend analysis across multiple matches
- [ ] Export trend data to CSV

### Long-term
- [ ] AI-powered insights and recommendations
- [ ] Predictive budgeting based on trends
- [ ] Social features (anonymized sharing)

## Related Documentation

- [Issue #80: getTrendAnalysis API](https://github.com/hyumat/marinos_log_oshikake/issues/80)
- [Issue #111: MatchInsights Page](https://github.com/hyumat/marinos_log_oshikake/issues/111)
- [PR #191: getTrendAnalysis API Implementation](https://github.com/hyumat/marinos_log_oshikake/pull/191)
- [PR #190: MatchInsights Page Implementation](https://github.com/hyumat/marinos_log_oshikake/pull/190)

## Changelog

### 2025-01-27 (PR #191)
- ✅ Initial implementation of getTrendAnalysis API
- ✅ k-anonymity protection (minimum 5 users)
- ✅ Category aggregation (transport, ticket, food, other)
- ✅ Budget distribution calculation
- ✅ Pro-only access control
- ✅ User exclusion from aggregation

### 2025-01-27 (Type Safety Improvements)
- ✅ Removed type-unsafe `as any` casts from MatchInsights.tsx
- ✅ Improved TypeScript type safety for API integration
- ✅ Added comprehensive tests for API and UI integration
