import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Copy,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Download,
} from "lucide-react";
import { EditableCell } from "@/components/admin/EditableCell";

interface MatchFormData {
  matchId: string;
  date: string;
  opponent: string;
  homeScore: number | null;
  awayScore: number | null;
  stadium: string;
  kickoff: string;
  competition: string;
  ticketSalesStart: string;
  notes: string;
  marinosSide: "home" | "away";
  homeTeam: string;
  awayTeam: string;
  status: string;
  roundLabel: string;
  roundNumber: number | null;
  teamId: number | null;
  seasonId: number | null;
}

const defaultFormData: MatchFormData = {
  matchId: "",
  date: "",
  opponent: "",
  homeScore: null,
  awayScore: null,
  stadium: "",
  kickoff: "",
  competition: "",
  ticketSalesStart: "",
  notes: "",
  marinosSide: "home",
  homeTeam: "横浜F・マリノス",
  awayTeam: "",
  status: "Scheduled",
  roundLabel: "",
  roundNumber: null,
  teamId: null,
  seasonId: null,
};

function MatchForm({
  data,
  onChange,
  isEdit,
  teams,
  seasons,
}: {
  data: MatchFormData;
  onChange: (data: MatchFormData) => void;
  isEdit: boolean;
  teams: { id: number; name: string; slug: string }[];
  seasons: { id: number; year: number; label: string | null }[];
}) {
  const handleChange = (field: keyof MatchFormData, value: any) => {
    const newData = { ...data, [field]: value };
    
    if (field === "marinosSide") {
      if (value === "home") {
        newData.homeTeam = "横浜F・マリノス";
        newData.awayTeam = data.opponent;
      } else {
        newData.homeTeam = data.opponent;
        newData.awayTeam = "横浜F・マリノス";
      }
    }
    
    if (field === "opponent") {
      if (data.marinosSide === "home") {
        newData.awayTeam = value;
      } else {
        newData.homeTeam = value;
      }
    }
    
    onChange(newData);
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="teamId">チーム</Label>
          <Select
            value={data.teamId?.toString() || ""}
            onValueChange={(value) => handleChange("teamId", value ? parseInt(value) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="チームを選択" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id.toString()}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="seasonId">シーズン</Label>
          <Select
            value={data.seasonId?.toString() || ""}
            onValueChange={(value) => handleChange("seasonId", value ? parseInt(value) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="シーズンを選択" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={season.id.toString()}>
                  {season.label || `${season.year}シーズン`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="matchId">試合ID</Label>
          <Input
            id="matchId"
            value={data.matchId}
            onChange={(e) => handleChange("matchId", e.target.value)}
            placeholder="2026-J1-01"
            disabled={isEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">試合日</Label>
          <Input
            id="date"
            type="date"
            value={data.date}
            onChange={(e) => handleChange("date", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="opponent">対戦相手</Label>
          <Input
            id="opponent"
            value={data.opponent}
            onChange={(e) => handleChange("opponent", e.target.value)}
            placeholder="川崎フロンターレ"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="marinosSide">ホーム/アウェイ</Label>
          <Select
            value={data.marinosSide}
            onValueChange={(value) => handleChange("marinosSide", value as "home" | "away")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">HOME</SelectItem>
              <SelectItem value="away">AWAY</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="homeScore">ホームスコア</Label>
          <Input
            id="homeScore"
            type="number"
            min="0"
            value={data.homeScore ?? ""}
            onChange={(e) => handleChange("homeScore", e.target.value ? parseInt(e.target.value) : null)}
            placeholder="-"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="awayScore">アウェイスコア</Label>
          <Input
            id="awayScore"
            type="number"
            min="0"
            value={data.awayScore ?? ""}
            onChange={(e) => handleChange("awayScore", e.target.value ? parseInt(e.target.value) : null)}
            placeholder="-"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kickoff">キックオフ</Label>
          <Input
            id="kickoff"
            type="time"
            value={data.kickoff}
            onChange={(e) => handleChange("kickoff", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stadium">スタジアム</Label>
          <Input
            id="stadium"
            value={data.stadium}
            onChange={(e) => handleChange("stadium", e.target.value)}
            placeholder="日産スタジアム"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="competition">大会名</Label>
          <Input
            id="competition"
            value={data.competition}
            onChange={(e) => handleChange("competition", e.target.value)}
            placeholder="J1リーグ"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="roundLabel">節ラベル</Label>
          <Input
            id="roundLabel"
            value={data.roundLabel}
            onChange={(e) => handleChange("roundLabel", e.target.value)}
            placeholder="第1節"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roundNumber">節番号</Label>
          <Input
            id="roundNumber"
            type="number"
            min="1"
            value={data.roundNumber ?? ""}
            onChange={(e) => handleChange("roundNumber", e.target.value ? parseInt(e.target.value) : null)}
            placeholder="1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ticketSalesStart">チケット販売開始</Label>
          <Input
            id="ticketSalesStart"
            type="date"
            value={data.ticketSalesStart}
            onChange={(e) => handleChange("ticketSalesStart", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">ステータス</Label>
          <Select
            value={data.status}
            onValueChange={(value) => handleChange("status", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Scheduled">予定</SelectItem>
              <SelectItem value="Finished">終了</SelectItem>
              <SelectItem value="Postponed">延期</SelectItem>
              <SelectItem value="Cancelled">中止</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">備考</Label>
        <Input
          id="notes"
          value={data.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="備考を入力"
        />
      </div>
    </div>
  );
}

function AdminMatchesContent() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [formData, setFormData] = useState<MatchFormData>(defaultFormData);
  const [importMode, setImportMode] = useState<'insert' | 'upsert'>('upsert');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [importTeamId, setImportTeamId] = useState<number | undefined>();
  const [importSeasonId, setImportSeasonId] = useState<number | undefined>();
  const limit = 20;

  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const teamParam = params.get("teamId");
    const seasonParam = params.get("seasonId");
    if (teamParam) setSelectedTeamId(parseInt(teamParam));
    if (seasonParam) setSelectedSeasonId(parseInt(seasonParam));
  }, []);

  const updateUrlParams = (teamId?: number, seasonId?: number) => {
    const params = new URLSearchParams();
    if (teamId) params.set("teamId", String(teamId));
    if (seasonId) params.set("seasonId", String(seasonId));
    const queryStr = params.toString();
    navigate(`/admin/matches${queryStr ? `?${queryStr}` : ''}`, { replace: true });
  };

  const handleTeamChange = (value: string) => {
    const newTeamId = value === "all" ? undefined : parseInt(value);
    setSelectedTeamId(newTeamId);
    setOffset(0);
    updateUrlParams(newTeamId, selectedSeasonId);
  };

  const handleSeasonChange = (value: string) => {
    const newSeasonId = value === "all" ? undefined : parseInt(value);
    setSelectedSeasonId(newSeasonId);
    setOffset(0);
    updateUrlParams(selectedTeamId, newSeasonId);
  };

  const utils = trpc.useUtils();

  const { data: teamsData } = trpc.admin.getTeams.useQuery();
  const { data: seasonsData } = trpc.admin.getSeasons.useQuery();

  const { data, isLoading, error } = trpc.admin.getMatches.useQuery({
    limit,
    offset,
    search: search || undefined,
    teamId: selectedTeamId,
    seasonId: selectedSeasonId,
  });

  const createMutation = trpc.admin.createMatch.useMutation({
    onSuccess: () => {
      toast.success("試合を作成しました");
      setIsCreateOpen(false);
      setFormData(defaultFormData);
      utils.admin.getMatches.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "作成に失敗しました");
    },
  });

  const updateMutation = trpc.admin.updateMatch.useMutation({
    onSuccess: () => {
      utils.admin.getMatches.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "更新に失敗しました");
      throw err;
    },
  });

  const deleteMutation = trpc.admin.deleteMatch.useMutation({
    onSuccess: () => {
      toast.success("試合を削除しました");
      setIsDeleteOpen(false);
      setSelectedMatch(null);
      utils.admin.getMatches.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "削除に失敗しました");
    },
  });

  const importMutation = trpc.admin.importMatchesCsv.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      if (result.summary.failed === 0) {
        toast.success(`${result.summary.inserted}件追加、${result.summary.updated}件更新しました`);
      } else {
        toast.warning(`${result.summary.failed}件のエラーがあります`);
      }
      utils.admin.getMatches.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "インポートに失敗しました");
    },
  });

  const headerMap: Record<string, string> = {
    '大会名': 'competition',
    '節': 'roundLabel',
    'HOME/AWAY': 'marinosSide',
    '試合日付': 'date',
    'キックオフ': 'kickoff',
    '対戦相手': 'opponent',
    '会場': 'stadium',
    '一次販売開始': 'ticketSales1',
    '二次販売開始': 'ticketSales2',
    '三次販売開始': 'ticketSales3',
    '一般販売開始': 'ticketSalesGeneral',
    '試合結果': 'resultScore',
    '勝敗': 'resultOutcome',
    '観客数': 'attendance',
    'match_id': 'matchId',
  };

  const dateColumns = ['試合日付', '一次販売開始', '二次販売開始', '三次販売開始', '一般販売開始'];
  const timeColumns = ['キックオフ'];
  const dateTimeColumns = ['一次販売開始', '二次販売開始', '三次販売開始', '一般販売開始'];
  const numericColumns = ['観客数'];

  const excelSerialToDate = (serial: number): Date => {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400 * 1000;
    return new Date(utcValue);
  };

  const excelSerialToTime = (serial: number): string => {
    const fractional = serial % 1;
    const totalSeconds = Math.round(fractional * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const formatDateValue = (value: any, header: string): string => {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    if (value instanceof Date) {
      if (timeColumns.includes(header)) {
        const hours = value.getHours();
        const minutes = value.getMinutes();
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      if (dateTimeColumns.includes(header)) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        const hours = String(value.getHours()).padStart(2, '0');
        const minutes = String(value.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      }
      if (dateColumns.includes(header)) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'number') {
      if (numericColumns.includes(header)) {
        return String(value);
      }
      if (timeColumns.includes(header) && value < 1) {
        return excelSerialToTime(value);
      }
      if (dateColumns.includes(header) || dateTimeColumns.includes(header)) {
        const date = excelSerialToDate(value);
        if (dateTimeColumns.includes(header)) {
          const fractional = value % 1;
          if (fractional > 0) {
            const timeStr = excelSerialToTime(value);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day} ${timeStr}`;
          }
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    return String(value);
  };

  const parseXlsxData = (workbook: XLSX.WorkBook): any[] => {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1, raw: true });
    
    if (jsonData.length < 2) {
      return [];
    }
    
    const headers = (jsonData[0] as any[]).map(h => String(h || '').trim());
    const parsedData: any[] = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const rowArr = rawData[i] as any[];
      if (!rowArr || rowArr.every(cell => cell === null || cell === undefined || cell === '')) {
        continue;
      }
      
      const row: any = {};
      headers.forEach((header, idx) => {
        const key = headerMap[header] || header;
        const rawValue = rowArr[idx];
        row[key] = formatDateValue(rawValue, header);
      });
      parsedData.push(row);
    }
    
    return parsedData;
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setImportResult(null);

    const fileName = file.name.toLowerCase();
    const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const parsedData = parseXlsxData(workbook);
          
          if (parsedData.length === 0) {
            toast.error('Excelファイルにデータがありません');
            return;
          }
          
          setCsvPreviewData(parsedData);
          toast.success(`${parsedData.length}件のデータを読み込みました`);
        } catch (error) {
          console.error('XLSX parse error:', error);
          toast.error('Excelファイルの読み込みに失敗しました');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error('CSV parse errors:', results.errors);
            toast.error('CSVファイルの読み込みに失敗しました');
            return;
          }

          if (results.data.length === 0) {
            toast.error('CSVファイルにデータがありません');
            return;
          }

          const parsedData: any[] = [];
          for (const rawRow of results.data as Record<string, string>[]) {
            const row: any = {};
            for (const [header, value] of Object.entries(rawRow)) {
              const key = headerMap[header] || header;
              row[key] = value || '';
            }
            parsedData.push(row);
          }

          setCsvPreviewData(parsedData);
          toast.success(`${parsedData.length}件のデータを読み込みました`);
        },
        error: (error) => {
          console.error('CSV parse error:', error);
          toast.error('CSVファイルの読み込みに失敗しました');
        },
      });
    }
  };

  const handleImportPreview = () => {
    if (!importTeamId || !importSeasonId) {
      toast.error('チームとシーズンを選択してください');
      return;
    }
    if (csvPreviewData.length === 0) {
      toast.error('CSVファイルを選択してください');
      return;
    }

    importMutation.mutate({
      teamId: importTeamId,
      seasonId: importSeasonId,
      mode: importMode,
      dryRun: true,
      csvData: csvPreviewData,
    });
  };

  const handleImportExecute = () => {
    if (!importTeamId || !importSeasonId) {
      toast.error('チームとシーズンを選択してください');
      return;
    }

    importMutation.mutate({
      teamId: importTeamId,
      seasonId: importSeasonId,
      mode: importMode,
      dryRun: false,
      csvData: csvPreviewData,
    });
  };

  const resetImportState = () => {
    setCsvFile(null);
    setCsvPreviewData([]);
    setImportResult(null);
    setImportTeamId(undefined);
    setImportSeasonId(undefined);
    setIsImportOpen(false);
  };

  const handleCellUpdate = useCallback(
    async (matchId: number, field: string, value: string | number | null) => {
      await updateMutation.mutateAsync({
        id: matchId,
        [field]: value,
      });
    },
    [updateMutation]
  );

  const handleDuplicateMatch = useCallback((match: any) => {
    setFormData({
      matchId: "",
      date: match.date,
      opponent: match.opponent,
      homeScore: null,
      awayScore: null,
      stadium: match.stadium || "",
      kickoff: match.kickoff || "",
      competition: match.competition || "",
      ticketSalesStart: match.ticketSalesStart || "",
      notes: "",
      marinosSide: match.marinosSide || "home",
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      status: "Scheduled",
      roundLabel: "",
      roundNumber: null,
      teamId: match.teamId,
      seasonId: match.seasonId,
    });
    setIsCreateOpen(true);
  }, []);

  if (user?.role !== "admin") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <h2 className="text-lg font-semibold mb-2">アクセス権限がありません</h2>
              <p className="text-slate-600 mb-4">
                このページは管理者のみアクセスできます。
              </p>
              <Button onClick={() => navigate("/app")}>ホームに戻る</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleCreate = () => {
    if (!formData.matchId || !formData.date || !formData.opponent) {
      toast.error("必須項目を入力してください");
      return;
    }
    createMutation.mutate({
      ...formData,
      homeScore: formData.homeScore,
      awayScore: formData.awayScore,
      stadium: formData.stadium || undefined,
      kickoff: formData.kickoff || undefined,
      competition: formData.competition || undefined,
      ticketSalesStart: formData.ticketSalesStart || undefined,
      notes: formData.notes || undefined,
      roundLabel: formData.roundLabel || undefined,
      roundNumber: formData.roundNumber || undefined,
      teamId: formData.teamId || undefined,
      seasonId: formData.seasonId || undefined,
    });
  };

  const handleDelete = () => {
    if (!selectedMatch) return;
    deleteMutation.mutate({ id: selectedMatch.id });
  };

  const handleCsvExport = async () => {
    if (!selectedTeamId || !selectedSeasonId) {
      toast.error("チームとシーズンを選択してください");
      return;
    }
    try {
      const result = await utils.admin.exportMatchesCsv.fetch({
        teamId: selectedTeamId,
        seasonId: selectedSeasonId,
      });
      if (!result.rows || result.rows.length === 0) {
        toast.info("エクスポート対象の試合がありません");
        return;
      }
      const headers = Object.keys(result.rows[0]);
      const escapeField = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };
      const csvContent = [
        '\uFEFF' + headers.map(escapeField).join(','),
        ...result.rows.map((row: Record<string, string>) => 
          headers.map(h => escapeField(row[h] || '')).join(',')
        ),
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const team = teams.find(t => t.id === selectedTeamId);
      const season = seasons.find(s => s.id === selectedSeasonId);
      const filename = `matches_${team?.slug || selectedTeamId}_${season?.year || selectedSeasonId}.csv`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${result.count}件の試合をエクスポートしました`);
    } catch (error: any) {
      toast.error(error.message || "エクスポートに失敗しました");
    }
  };

  const teams = teamsData?.teams || [];
  const seasons = seasonsData?.seasons || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            試合管理
          </h1>
          <p className="text-slate-600 mt-1">
            試合データの追加・編集・削除を行います（セルをクリックして直接編集）
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCsvExport}
            disabled={!selectedTeamId || !selectedSeasonId}
            title={!selectedTeamId || !selectedSeasonId ? "チームとシーズンを選択してください" : undefined}
          >
            <Download className="h-4 w-4 mr-2" />
            CSVエクスポート
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            CSVインポート
          </Button>
          <Button onClick={() => {
            const defaultData = { ...defaultFormData };
            if (selectedTeamId) defaultData.teamId = selectedTeamId;
            if (selectedSeasonId) defaultData.seasonId = selectedSeasonId;
            setFormData(defaultData);
            setIsCreateOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            試合を追加
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4">
              <Select
                value={selectedTeamId?.toString() || "all"}
                onValueChange={handleTeamChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="チーム" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全チーム</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSeasonId?.toString() || "all"}
                onValueChange={handleSeasonChange}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="シーズン" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全シーズン</SelectItem>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id.toString()}>
                      {season.label || `${season.year}シーズン`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="対戦相手、スタジアム、大会名で検索..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              データの取得に失敗しました
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">日付</TableHead>
                      <TableHead className="w-[60px]">KO</TableHead>
                      <TableHead className="w-[60px]">H/A</TableHead>
                      <TableHead className="min-w-[120px]">対戦相手</TableHead>
                      <TableHead className="w-[80px]">結果</TableHead>
                      <TableHead className="w-[60px]">勝敗</TableHead>
                      <TableHead className="min-w-[150px]">スタジアム</TableHead>
                      <TableHead className="min-w-[100px]">大会</TableHead>
                      <TableHead className="w-[70px]">節</TableHead>
                      <TableHead className="w-[80px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.matches.map((match) => (
                      <TableRow key={match.id} className="hover:bg-slate-50">
                        <TableCell className="p-0">
                          <EditableCell
                            value={match.date}
                            type="date"
                            onSave={async (val) => {
                              await handleCellUpdate(match.id, "date", val as string);
                            }}
                          />
                        </TableCell>
                        <TableCell className="p-0">
                          <EditableCell
                            value={match.kickoff}
                            type="time"
                            onSave={async (val) => {
                              await handleCellUpdate(match.id, "kickoff", val);
                            }}
                            emptyText="--:--"
                          />
                        </TableCell>
                        <TableCell className="p-0">
                          <EditableCell
                            value={match.marinosSide || ""}
                            type="select"
                            options={[
                              { value: "home", label: "H" },
                              { value: "away", label: "A" },
                            ]}
                            onSave={async (val) => {
                              await handleCellUpdate(match.id, "marinosSide", val);
                            }}
                          />
                        </TableCell>
                        <TableCell className="p-0">
                          <EditableCell
                            value={match.opponent}
                            onSave={async (val) => {
                              await handleCellUpdate(match.id, "opponent", val as string);
                            }}
                          />
                        </TableCell>
                        <TableCell className="p-0">
                          <div className="flex items-center gap-1 px-2">
                            <EditableCell
                              value={match.homeScore}
                              type="number"
                              onSave={async (val) => {
                                await handleCellUpdate(match.id, "homeScore", val);
                              }}
                              emptyText="-"
                              className="w-8 text-center"
                            />
                            <span className="text-slate-400">-</span>
                            <EditableCell
                              value={match.awayScore}
                              type="number"
                              onSave={async (val) => {
                                await handleCellUpdate(match.id, "awayScore", val);
                              }}
                              emptyText="-"
                              className="w-8 text-center"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-0">
                          <EditableCell
                            value={match.resultOutcome || "none"}
                            type="select"
                            options={[
                              { value: "none", label: "-" },
                              { value: "win", label: "勝" },
                              { value: "draw", label: "分" },
                              { value: "loss", label: "負" },
                            ]}
                            onSave={async (val) => {
                              await handleCellUpdate(match.id, "resultOutcome", val === "none" ? null : val);
                            }}
                          />
                        </TableCell>
                        <TableCell className="p-0">
                          <EditableCell
                            value={match.stadium}
                            onSave={async (val) => {
                              await handleCellUpdate(match.id, "stadium", val);
                            }}
                          />
                        </TableCell>
                        <TableCell className="p-0">
                          <EditableCell
                            value={match.competition}
                            onSave={async (val) => {
                              await handleCellUpdate(match.id, "competition", val);
                            }}
                          />
                        </TableCell>
                        <TableCell className="p-0">
                          <EditableCell
                            value={match.roundLabel}
                            onSave={async (val) => {
                              await handleCellUpdate(match.id, "roundLabel", val);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDuplicateMatch(match)}
                              title="複製"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedMatch(match);
                                setIsDeleteOpen(true);
                              }}
                              title="削除"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-600">
                  {data?.total || 0}件中 {offset + 1}-
                  {Math.min(offset + limit, data?.total || 0)}件を表示
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(offset + limit)}
                    disabled={!data?.hasMore}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>試合を追加</DialogTitle>
            <DialogDescription>
              新しい試合情報を入力してください
            </DialogDescription>
          </DialogHeader>
          <MatchForm
            data={formData}
            onChange={setFormData}
            isEdit={false}
            teams={teams}
            seasons={seasons}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "作成中..." : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>試合を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMatch && (
                <>
                  {selectedMatch.date} vs {selectedMatch.opponent} を削除します。
                  この操作は取り消せません。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isImportOpen} onOpenChange={(open) => { if (!open) resetImportState(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              CSVインポート
            </DialogTitle>
            <DialogDescription>
              CSVファイルから試合データを一括登録・更新します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>対象チーム</Label>
                <Select
                  value={importTeamId?.toString() || ""}
                  onValueChange={(v) => setImportTeamId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="チームを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>対象シーズン</Label>
                <Select
                  value={importSeasonId?.toString() || ""}
                  onValueChange={(v) => setImportSeasonId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="シーズンを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id.toString()}>
                        {season.label || `${season.year}シーズン`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>取り込みモード</Label>
              <Select
                value={importMode}
                onValueChange={(v) => setImportMode(v as 'insert' | 'upsert')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="insert">追加のみ（既存はスキップ）</SelectItem>
                  <SelectItem value="upsert">追加＋更新（Upsert）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>CSV/Excelファイル</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleCsvFileChange}
              />
              <p className="text-xs text-slate-500">
                対応形式: CSV、Excel（.xlsx/.xls）/ 必須列: 試合日付, 対戦相手, 会場 / 任意列: 大会名, 節, HOME/AWAY, キックオフ, 試合結果, 勝敗, 観客数
              </p>
            </div>

            {csvPreviewData.length > 0 && !importResult && (
              <div className="space-y-2">
                <Label>プレビュー（先頭10行）</Label>
                <div className="border rounded-md overflow-x-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>日付</TableHead>
                        <TableHead>対戦相手</TableHead>
                        <TableHead>会場</TableHead>
                        <TableHead>H/A</TableHead>
                        <TableHead>大会</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreviewData.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-slate-500">{idx + 1}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.opponent}</TableCell>
                          <TableCell>{row.stadium}</TableCell>
                          <TableCell>{row.marinosSide}</TableCell>
                          <TableCell>{row.competition}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-slate-600">
                  全{csvPreviewData.length}行
                </p>
              </div>
            )}

            {importResult && (
              <div className="space-y-4">
                <div className="p-4 rounded-md bg-slate-100">
                  <h4 className="font-medium mb-2">
                    {importResult.preview ? 'プレビュー結果' : '取り込み結果'}
                  </h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>追加: {importResult.summary.inserted}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span>更新: {importResult.summary.updated}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">スキップ: {importResult.summary.skipped}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span>失敗: {importResult.summary.failed}</span>
                    </div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-red-600">エラー行</Label>
                    <div className="border border-red-200 rounded-md overflow-x-auto max-h-40">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>行</TableHead>
                            <TableHead>エラー</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.errors.map((err: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{err.rowNumber}</TableCell>
                              <TableCell className="text-red-600">{err.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetImportState}>
              キャンセル
            </Button>
            {!importResult ? (
              <Button
                onClick={handleImportPreview}
                disabled={importMutation.isPending || csvPreviewData.length === 0}
              >
                {importMutation.isPending ? "確認中..." : "プレビュー"}
              </Button>
            ) : importResult.preview ? (
              <Button
                onClick={handleImportExecute}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? "インポート中..." : "インポート実行"}
              </Button>
            ) : (
              <Button onClick={resetImportState}>
                完了
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminMatches() {
  return <AdminMatchesContent />;
}
