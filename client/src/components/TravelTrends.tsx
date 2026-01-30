/**
 * Issue #81: 遠征傾向表示コンポーネント
 *
 * 試合ごとの遠征傾向（宿泊・交通手段・予算帯）を集約して表示する。
 * k-匿名性により十分なデータがない場合は案内メッセージを表示。
 */

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';

/** 各カテゴリの日本語ラベル */
const LABELS: Record<string, Record<string, string>> = {
  lodging: {
    day_trip: '日帰り',
    hotel: 'ホテル・旅館',
    friend: '友人宅',
    night_bus: '夜行バス',
    other: 'その他',
  },
  transport: {
    shinkansen: '新幹線',
    airplane: '飛行機',
    car: '車',
    bus: 'バス',
    local_train: '在来線',
    other: 'その他',
  },
  budget: {
    under_5k: '〜¥5,000',
    '5k_10k': '¥5,000〜¥10,000',
    '10k_20k': '¥10,000〜¥20,000',
    '20k_30k': '¥20,000〜¥30,000',
    '30k_50k': '¥30,000〜¥50,000',
    over_50k: '¥50,000〜',
    other: 'その他',
  },
};

function BreakdownBar({
  category,
  breakdown,
}: {
  category: 'lodging' | 'transport' | 'budget';
  breakdown: Record<string, number>;
}) {
  const entries = Object.entries(breakdown).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return null;

  const labels = LABELS[category] ?? {};

  return (
    <div className="space-y-1.5">
      {entries.map(([key, pct]) => (
        <div key={key} className="flex items-center gap-2 text-sm">
          <span className="w-24 truncate text-muted-foreground text-xs">
            {labels[key] ?? key}
          </span>
          <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
            <div
              className="h-full bg-primary/70 rounded-sm transition-all"
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs tabular-nums">{pct}%</span>
        </div>
      ))}
    </div>
  );
}

interface TravelTrendsProps {
  matchId: number;
}

export function TravelTrends({ matchId }: TravelTrendsProps) {
  const { data, isLoading } = trpc.travelIntents.trends.useQuery(
    { matchId },
    { enabled: !isNaN(matchId) },
  );

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.available) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            遠征傾向
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            まだ十分なデータがありません。遠征プランを登録して傾向の表示に貢献しましょう！
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          遠征傾向
          <span className="text-xs font-normal text-muted-foreground">
            ({data.totalCount}人)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">宿泊</h4>
          <BreakdownBar category="lodging" breakdown={data.lodgingBreakdown} />
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">交通手段</h4>
          <BreakdownBar category="transport" breakdown={data.transportBreakdown} />
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">予算帯</h4>
          <BreakdownBar category="budget" breakdown={data.budgetBreakdown} />
        </div>
      </CardContent>
    </Card>
  );
}
