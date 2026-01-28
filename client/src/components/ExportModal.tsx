import { useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const exportQuery = trpc.userMatches.exportData.useQuery(
    selectedYear === "all" ? {} : { year: parseInt(selectedYear) },
    { enabled: false }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        if (result.data.length === 0) {
          toast.info("エクスポートするデータがありません");
          return;
        }
        const csvContent = generateCSV(result.data);
        downloadCSV(csvContent, `oshikake-export-${selectedYear === "all" ? "all" : selectedYear}.csv`);
        toast.success(`${result.data.length}件のデータをエクスポートしました`);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("エクスポートに失敗しました。もう一度お試しください。");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            データエクスポート
          </DialogTitle>
          <DialogDescription>
            観戦記録をCSV形式でエクスポートします
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="year">対象年</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger id="year">
                <SelectValue placeholder="年を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての年</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p>エクスポートされるデータ:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>試合日・対戦相手・会場</li>
              <li>HOME/AWAY・大会名</li>
              <li>試合結果・スコア</li>
              <li>交通費・チケット代・飲食費・その他費用</li>
              <li>メモ</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            CSVでダウンロード
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ExportRow {
  date: string;
  opponent: string;
  homeAway: string;
  competition: string;
  section: string;
  venue: string;
  result: string;
  score: string;
  transport: number;
  ticket: number;
  food: number;
  other: number;
  totalExpense: number;
  note: string;
}

function generateCSV(data: ExportRow[]): string {
  const headers = [
    "日付",
    "対戦相手",
    "HOME/AWAY",
    "大会",
    "節",
    "会場",
    "結果",
    "スコア",
    "交通費",
    "チケット代",
    "飲食費",
    "その他",
    "費用合計",
    "メモ",
  ];

  const rows = data.map((row) => [
    row.date,
    row.opponent,
    row.homeAway,
    row.competition,
    row.section,
    row.venue,
    row.result,
    row.score,
    row.transport.toString(),
    row.ticket.toString(),
    row.food.toString(),
    row.other.toString(),
    row.totalExpense.toString(),
    row.note.replace(/"/g, '""'),
  ]);

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell}"`).join(",")
    ),
  ];

  return "\uFEFF" + csvRows.join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
