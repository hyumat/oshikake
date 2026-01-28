import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  KpiCard,
  SectionHeader,
  FilterBar,
  EmptyState,
} from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  TrendingDown,
  Calendar,
  Train,
  Ticket,
  Utensils,
  MoreHorizontal,
  Receipt,
} from "lucide-react";
import { useLocation } from "wouter";

const periodOptions = [
  { value: "all", label: "全期間" },
  { value: "2025", label: "2025年" },
  { value: "2024", label: "2024年" },
];

const categoryIcons: Record<string, typeof Train> = {
  transport: Train,
  ticket: Ticket,
  food: Utensils,
  other: MoreHorizontal,
};

const categoryLabels: Record<string, string> = {
  transport: "交通費",
  ticket: "チケット",
  food: "飲食費",
  other: "その他",
};

export default function Expenses() {
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [, navigate] = useLocation();

  const year = selectedPeriod !== "all" && selectedPeriod !== "30days"
    ? parseInt(selectedPeriod)
    : undefined;

  const statsQuery = trpc.stats.getSummary.useQuery({ year });
  const matchesQuery = trpc.userMatches.list.useQuery({});

  const stats = statsQuery.data;
  const matchCount = stats?.watchCount || 0;
  const totalExpenses = stats?.cost?.total || 0;
  const avgPerMatch = stats?.cost?.averagePerMatch || 0;

  if (matchesQuery.isLoading || statsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="費用管理" description="観戦にかかった費用を管理します" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="費用管理"
        description="観戦にかかった費用を管理します"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="総支出"
          value={`¥${totalExpenses.toLocaleString()}`}
          icon={Wallet}
        />
        <KpiCard
          title="1試合あたり平均"
          value={`¥${Math.round(avgPerMatch).toLocaleString()}`}
          icon={TrendingDown}
        />
        <KpiCard
          title="観戦試合数"
          value={matchCount}
          subtitle={year ? `${year}年` : "全期間"}
          icon={Calendar}
        />
        <KpiCard
          title="勝敗"
          value={`${stats?.record?.win || 0}勝${stats?.record?.draw || 0}分${stats?.record?.loss || 0}敗`}
          icon={Receipt}
        />
      </div>

      <FilterBar
        periodOptions={periodOptions}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        showExport
        onExport={() => alert("エクスポート機能は開発中です")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader title="費用の詳細" />
          {matchCount === 0 ? (
            <EmptyState
              icon={Receipt}
              title="費用記録がありません"
              description="試合に参加して費用を記録しましょう"
              action={
                <Button variant="outline" onClick={() => navigate("/matches")}>
                  試合一覧へ
                </Button>
              }
            />
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground py-8">
                  費用の詳細は試合詳細ページで確認・編集できます
                </p>
                <div className="flex justify-center">
                  <Button onClick={() => navigate("/matches")}>
                    試合一覧を見る
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <SectionHeader title="カテゴリ別" />
          <Card>
            <CardContent className="p-4 space-y-3">
              {Object.entries(categoryLabels).map(([category, label]) => {
                const Icon = categoryIcons[category] || Receipt;
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      試合詳細で確認
                    </span>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground text-center pt-2">
                カテゴリ別の集計機能は今後追加予定です
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
