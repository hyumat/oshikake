import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Calendar,
  MapPin,
  Trophy,
} from "lucide-react";

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
};

function MatchForm({
  data,
  onChange,
  isEdit,
}: {
  data: MatchFormData;
  onChange: (data: MatchFormData) => void;
  isEdit: boolean;
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
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [formData, setFormData] = useState<MatchFormData>(defaultFormData);
  const limit = 20;

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.admin.getMatches.useQuery({
    limit,
    offset,
    search: search || undefined,
    year: yearFilter,
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
      toast.success("試合を更新しました");
      setIsEditOpen(false);
      setSelectedMatch(null);
      utils.admin.getMatches.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "更新に失敗しました");
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

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
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
    });
  };

  const handleEdit = (match: any) => {
    setSelectedMatch(match);
    setFormData({
      matchId: match.matchId,
      date: match.date,
      opponent: match.opponent,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      stadium: match.stadium || "",
      kickoff: match.kickoff || "",
      competition: match.competition || "",
      ticketSalesStart: match.ticketSalesStart || "",
      notes: match.notes || "",
      marinosSide: match.marinosSide || "home",
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      status: match.status || "Scheduled",
      roundLabel: match.roundLabel || "",
      roundNumber: match.roundNumber,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedMatch) return;
    updateMutation.mutate({
      id: selectedMatch.id,
      ...formData,
      stadium: formData.stadium || null,
      kickoff: formData.kickoff || null,
      competition: formData.competition || null,
      ticketSalesStart: formData.ticketSalesStart || null,
      notes: formData.notes || null,
      roundLabel: formData.roundLabel || null,
      roundNumber: formData.roundNumber,
    });
  };

  const handleDelete = () => {
    if (!selectedMatch) return;
    deleteMutation.mutate({ id: selectedMatch.id });
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              試合管理
            </h1>
            <p className="text-slate-600 mt-1">
              試合データの追加・編集・削除を行います
            </p>
          </div>
          <Button onClick={() => {
            setFormData(defaultFormData);
            setIsCreateOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            試合を追加
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
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
              <Select
                value={yearFilter?.toString() || "all"}
                onValueChange={(value) => {
                  setYearFilter(value === "all" ? undefined : parseInt(value));
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="年度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全期間</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                        <TableHead className="w-[100px]">日付</TableHead>
                        <TableHead>試合</TableHead>
                        <TableHead className="w-[80px]">結果</TableHead>
                        <TableHead className="w-[150px]">スタジアム</TableHead>
                        <TableHead className="w-[100px]">大会</TableHead>
                        <TableHead className="w-[80px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.matches.map((match) => (
                        <TableRow key={match.id}>
                          <TableCell className="font-mono text-sm">
                            {match.date}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={match.marinosSide === "home" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {match.marinosSide === "home" ? "H" : "A"}
                              </Badge>
                              <span className="font-medium">{match.opponent}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {match.isResult ? (
                              <span className="font-mono">
                                {match.homeScore} - {match.awayScore}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {match.stadium || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {match.competition || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(match)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedMatch(match);
                                  setIsDeleteOpen(true);
                                }}
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
            <MatchForm data={formData} onChange={setFormData} isEdit={false} />
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

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>試合を編集</DialogTitle>
              <DialogDescription>
                試合情報を編集してください
              </DialogDescription>
            </DialogHeader>
            <MatchForm data={formData} onChange={setFormData} isEdit={true} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "更新中..." : "更新"}
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
      </div>
    </DashboardLayout>
  );
}

export default function AdminMatches() {
  return <AdminMatchesContent />;
}
