/**
 * Issue #110: 過去の自分コンポーネント
 *
 * Plus以上のユーザーに、同一スタジアムまたは同一対戦相手の
 * 過去の観戦記録（最大3件）を表示する。
 * Freeユーザーにはロック表示とアップグレード誘導を出す。
 */

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Lock, Trophy, Minus, X } from 'lucide-react';

interface PastSelfProps {
  matchId: number;
  opponent: string;
  stadium?: string | null;
}

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return null;
  const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    W: { label: '勝ち', icon: <Trophy className="w-3 h-3" />, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    D: { label: '引分', icon: <Minus className="w-3 h-3" />, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    L: { label: '負け', icon: <X className="w-3 h-3" />, className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  };
  const info = map[result];
  if (!info) return null;
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${info.className}`}>
      {info.icon}
      {info.label}
    </Badge>
  );
}

export function PastSelf({ matchId, opponent, stadium }: PastSelfProps) {
  const { data, isLoading } = trpc.pastSelf.get.useQuery(
    { matchId, opponent, stadium: stadium ?? undefined },
    { enabled: !isNaN(matchId) },
  );

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Free ユーザー: ロック表示
  if (!data.available && data.reason === 'plan_required') {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            過去の自分
            <Badge variant="secondary" className="ml-1 text-xs">Plus</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              過去の遠征記録を振り返る機能はPlus/Proプランでご利用いただけます。
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/pricing">プランをアップグレード</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // データなしまたは DB 未接続
  if (!data.available || !data.records || data.records.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4" />
          過去の自分
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          同じ対戦相手・スタジアムでの過去の観戦記録
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.records.map((record) => (
          <div
            key={record.id}
            className="border rounded-lg p-3 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{record.date}</span>
              <ResultBadge result={record.resultWdl} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>vs {record.opponent}</span>
              {record.marinosGoals != null && record.opponentGoals != null && (
                <span>
                  {record.marinosGoals}-{record.opponentGoals}
                </span>
              )}
            </div>
            {record.stadium && (
              <p className="text-xs text-muted-foreground">{record.stadium}</p>
            )}
            <div className="flex items-center justify-between text-xs">
              {record.costYen != null && record.costYen > 0 && (
                <span className="font-medium">
                  ¥{record.costYen.toLocaleString()}
                </span>
              )}
              {record.competition && (
                <span className="text-muted-foreground">{record.competition}</span>
              )}
            </div>
            {record.note && (
              <p className="text-xs text-muted-foreground border-t pt-1.5 mt-1.5">
                {record.note}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
