import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@shared/formatters";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Copy,
  Calendar,
  Trophy,
  Wallet,
  Home,
  Plane,
  TrendingUp,
  CheckCircle2
} from "lucide-react";

interface MonthlyReportProps {
  defaultYear?: number;
  defaultMonth?: number;
}

export function MonthlyReport({ defaultYear, defaultMonth }: MonthlyReportProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(defaultYear ?? currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth ?? currentDate.getMonth() + 1);

  // Get available years
  const { data: yearsData } = trpc.stats.getAvailableYears.useQuery();

  // Get available months for selected year
  const { data: monthsData } = trpc.stats.getAvailableMonths.useQuery(
    { year: selectedYear },
    { enabled: !!selectedYear }
  );

  // Get monthly report
  const { data: reportData, isLoading } = trpc.stats.getMonthlyReport.useQuery(
    { year: selectedYear, month: selectedMonth },
    { enabled: !!selectedYear && !!selectedMonth }
  );

  const report = reportData?.data;
  const availableYears = yearsData?.years ?? [];
  const availableMonths = monthsData?.months ?? [];

  // Export to CSV
  const handleExportCSV = () => {
    if (!report) return;

    const csvContent = [
      ["月次レポート", `${report.year}年${report.monthName}`],
      [],
      ["項目", "値"],
      ["観戦試合数", report.watchCount.toString()],
      ["勝ち", report.record.win.toString()],
      ["引き分け", report.record.draw.toString()],
      ["負け", report.record.loss.toString()],
      ["費用合計", report.cost.total.toString()],
      ["1試合あたり平均", report.cost.averagePerMatch.toString()],
      ["ホーム観戦", report.homeAwayBreakdown.home.toString()],
      ["アウェイ観戦", report.homeAwayBreakdown.away.toString()],
      [],
      ["カテゴリ別費用"],
      ["カテゴリ", "金額", "割合"],
      ...report.topCategories.map((cat) => {
        const labels: Record<string, string> = {
          transport: "交通費",
          ticket: "チケット代",
          food: "飲食費",
          other: "その他",
        };
        return [labels[cat.category] || cat.category, cat.amount.toString(), `${cat.percentage}%`];
      }),
      [],
      ["観戦試合"],
      ["日付", "対戦相手", "会場", "費用", "結果"],
      ...report.matches.map((m) => [
        m.date ?? "",
        m.opponent ?? "",
        m.stadium ?? "",
        m.cost?.toString() ?? "0",
        m.result ?? "",
      ]),
    ];

    const csvString = csvContent
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marinos_report_${report.year}_${String(report.month).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("CSVファイルをダウンロードしました");
  };

  // Copy to clipboard
  const handleCopyToClipboard = () => {
    if (!report) return;

    const textContent = [
      `【${report.year}年${report.monthName} 月次レポート】`,
      "",
      `観戦試合数: ${report.watchCount}試合`,
      `戦績: ${report.record.win}勝${report.record.draw}分${report.record.loss}敗`,
      `費用合計: ${formatCurrency(report.cost.total)}`,
      `1試合平均: ${formatCurrency(report.cost.averagePerMatch)}`,
      `ホーム/アウェイ: ${report.homeAwayBreakdown.home}試合 / ${report.homeAwayBreakdown.away}試合`,
      "",
      "【費用内訳】",
      ...report.topCategories.map((cat) => {
        const labels: Record<string, string> = {
          transport: "交通費",
          ticket: "チケット代",
          food: "飲食費",
          other: "その他",
        };
        return `${labels[cat.category] || cat.category}: ${formatCurrency(cat.amount)} (${cat.percentage}%)`;
      }),
      "",
      "【コメント】",
      ...report.commentary,
    ].join("\n");

    navigator.clipboard.writeText(textContent);
    toast.success("クリップボードにコピーしました");
  };

  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              月次レポート
            </CardTitle>
            <CardDescription>月ごとの観戦記録サマリー</CardDescription>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.length > 0 ? (
                  availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value={currentDate.getFullYear().toString()}>
                    {currentDate.getFullYear()}年
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, index) => (
                  <SelectItem
                    key={index + 1}
                    value={(index + 1).toString()}
                    disabled={availableMonths.length > 0 && !availableMonths.includes(index + 1)}
                  >
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !report || report.watchCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-4 opacity-20" />
            <p>{selectedYear}年{monthNames[selectedMonth - 1]}の観戦記録はありません</p>
            <p className="text-sm mt-1">他の月を選択してください</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Watch Count */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm">観戦数</span>
                </div>
                <div className="text-2xl font-bold">{report.watchCount}試合</div>
              </div>

              {/* Total Cost */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm">費用合計</span>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(report.cost.total)}</div>
              </div>

              {/* Average */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">平均/試合</span>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(report.cost.averagePerMatch)}</div>
              </div>

              {/* Record */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">戦績</span>
                </div>
                <div className="text-2xl font-bold">
                  {report.record.win}勝{report.record.draw}分{report.record.loss}敗
                </div>
              </div>
            </div>

            {/* HOME/AWAY Breakdown */}
            <div className="bg-muted rounded-lg p-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">ホーム/アウェイ内訳</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-blue-500" />
                  <span>ホーム: {report.homeAwayBreakdown.home}試合</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-orange-500" />
                  <span>アウェイ: {report.homeAwayBreakdown.away}試合</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${
                      report.homeAwayBreakdown.home + report.homeAwayBreakdown.away > 0
                        ? (report.homeAwayBreakdown.home /
                            (report.homeAwayBreakdown.home + report.homeAwayBreakdown.away)) *
                          100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Top Categories */}
            {report.topCategories.length > 0 && (
              <div className="bg-muted rounded-lg p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">費用カテゴリTOP3</h4>
                <div className="space-y-2">
                  {report.topCategories.map((cat, index) => {
                    const labels: Record<string, string> = {
                      transport: "交通費",
                      ticket: "チケット代",
                      food: "飲食費",
                      other: "その他",
                    };
                    const colors = [
                      "bg-yellow-500",
                      "bg-gray-400",
                      "bg-orange-400",
                    ];
                    return (
                      <div key={cat.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${colors[index]} flex items-center justify-center text-white text-xs font-bold`}>
                            {index + 1}
                          </div>
                          <span>{labels[cat.category] || cat.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{formatCurrency(cat.amount)}</span>
                          <span className="text-muted-foreground ml-2">({cat.percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Commentary */}
            {report.commentary.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">サマリーコメント</h4>
                <div className="space-y-1">
                  {report.commentary.map((comment, index) => (
                    <p key={index} className="text-sm text-blue-700 dark:text-blue-300">
                      {comment}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                <Copy className="mr-2 h-4 w-4" />
                コピー
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                CSV出力
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
