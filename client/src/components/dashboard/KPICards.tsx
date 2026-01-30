/**
 * KPI Cards Component
 * ダッシュボードのKPIカードセクション
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Wallet, Calculator, PieChart } from "lucide-react";
import { formatCurrency } from "@shared/formatters";

interface StatsData {
  watchCount: number;
  record: {
    win: number;
    draw: number;
    loss: number;
  };
  cost: {
    total: number;
    averagePerMatch: number;
  };
}

interface KPICardsProps {
  statsData?: StatsData;
  isLoading: boolean;
}

export function KPICards({ statsData, isLoading }: KPICardsProps) {
  const hasData = statsData && statsData.watchCount > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Watch Count */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            観戦試合数
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-20" />
          ) : (
            <>
              <div className="text-3xl font-bold">{statsData?.watchCount ?? 0}</div>
              <p className="text-sm text-muted-foreground">試合</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Total Cost */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            費用合計
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <div className="text-3xl font-bold">
              {formatCurrency(statsData?.cost?.total)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Average Per Match */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            1試合あたり平均
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <>
              <div className="text-3xl font-bold">
                {formatCurrency(Math.round(statsData?.cost?.averagePerMatch ?? 0))}
              </div>
              <p className="text-sm text-muted-foreground">/試合</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Win Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            勝率
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-20" />
          ) : (
            <>
              <div className="text-3xl font-bold">
                {(() => {
                  if (!hasData) return "0.0%";
                  const wins = statsData.record.win;
                  const total = wins + statsData.record.draw + statsData.record.loss;
                  return total > 0 ? `${((wins / total) * 100).toFixed(1)}%` : "0.0%";
                })()}
              </div>
              <p className="text-sm text-muted-foreground">
                {statsData?.record?.win ?? 0}勝 {statsData?.record?.draw ?? 0}分 {statsData?.record?.loss ?? 0}敗
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
