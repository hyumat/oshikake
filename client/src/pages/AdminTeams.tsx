import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Shield,
  Users,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface TeamFormData {
  name: string;
  slug: string;
  aliases: string;
}

const defaultFormData: TeamFormData = {
  name: "",
  slug: "",
  aliases: "",
};

function AdminTeamsContent() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [formData, setFormData] = useState<TeamFormData>(defaultFormData);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.admin.getTeams.useQuery();

  const createMutation = trpc.admin.createTeam.useMutation({
    onSuccess: () => {
      toast.success("チームを作成しました");
      setIsCreateOpen(false);
      setFormData(defaultFormData);
      utils.admin.getTeams.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "作成に失敗しました");
    },
  });

  const updateMutation = trpc.admin.updateTeam.useMutation({
    onSuccess: () => {
      toast.success("チームを更新しました");
      setIsEditOpen(false);
      setSelectedTeam(null);
      setFormData(defaultFormData);
      utils.admin.getTeams.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "更新に失敗しました");
    },
  });

  const deleteMutation = trpc.admin.deleteTeam.useMutation({
    onSuccess: () => {
      toast.success("チームを削除しました");
      setIsDeleteOpen(false);
      setSelectedTeam(null);
      utils.admin.getTeams.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "削除に失敗しました");
    },
  });

  const importJLeagueMutation = trpc.admin.importJLeagueTeams.useMutation({
    onSuccess: (result) => {
      toast.success(`J.Leagueチームをインポートしました（${result.inserted}件追加、${result.updated}件更新）`);
      utils.admin.getTeams.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "インポートに失敗しました");
    },
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Shield className="h-16 w-16 text-slate-400" />
              <p className="text-lg text-slate-600">管理者権限が必要です</p>
              <Button onClick={() => navigate("/app")}>ホームへ戻る</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teams = data?.teams || [];

  const handleCreate = () => {
    if (!formData.name || !formData.slug) {
      toast.error("チーム名とslugは必須です");
      return;
    }
    createMutation.mutate({
      name: formData.name,
      slug: formData.slug,
      aliases: formData.aliases || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedTeam) return;
    updateMutation.mutate({
      id: selectedTeam.id,
      name: formData.name || undefined,
      slug: formData.slug || undefined,
      aliases: formData.aliases || null,
    });
  };

  const handleDelete = () => {
    if (!selectedTeam) return;
    deleteMutation.mutate({ id: selectedTeam.id });
  };

  const openEditDialog = (team: any) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      slug: team.slug,
      aliases: team.aliases || "",
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (team: any) => {
    setSelectedTeam(team);
    setIsDeleteOpen(true);
  };

  const handleToggleActive = (teamId: number, isActive: boolean) => {
    updateMutation.mutate(
      { id: teamId, isActive },
      {
        onSuccess: () => {
          toast.success(isActive ? "チームを有効にしました" : "チームを非表示にしました");
        },
      }
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              チーム管理
            </h1>
            <p className="text-sm text-slate-500">
              チームの追加・編集・削除を行います
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => importJLeagueMutation.mutate()}
            disabled={importJLeagueMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {importJLeagueMutation.isPending ? "インポート中..." : "J.Leagueチームをインポート"}
          </Button>
          <Button onClick={() => {
            setFormData(defaultFormData);
            setIsCreateOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            チームを追加
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>登録済みチーム</CardTitle>
          <CardDescription>
            試合管理やCSVインポートで使用するチームを管理します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              データの取得に失敗しました
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              チームが登録されていません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>チーム名</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>別名（エイリアス）</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id} className={!team.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {team.name}
                        {!team.isActive && (
                          <Badge variant="outline" className="text-slate-400">
                            <EyeOff className="h-3 w-3 mr-1" />
                            非表示
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{team.slug}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {team.aliases || "-"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={team.isActive}
                        onCheckedChange={(checked) => handleToggleActive(team.id, checked)}
                        aria-label={team.isActive ? "アクティブ" : "非アクティブ"}
                      />
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(team.createdAt).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(team)}
                          title="編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(team)}
                          title="削除"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>チームを追加</DialogTitle>
            <DialogDescription>
              新しいチームを登録します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">チーム名 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="横浜F・マリノス"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="ym"
              />
              <p className="text-xs text-slate-500">
                半角英数字とハイフンのみ（URL等に使用）
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aliases">別名（エイリアス）</Label>
              <Input
                id="aliases"
                value={formData.aliases}
                onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                placeholder="マリノス,横浜マリノス"
              />
              <p className="text-xs text-slate-500">
                カンマ区切りで複数指定可（CSVインポート時の表記揺れ対応）
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "作成中..." : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>チームを編集</DialogTitle>
            <DialogDescription>
              チーム情報を更新します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">チーム名</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-aliases">別名（エイリアス）</Label>
              <Input
                id="edit-aliases"
                value={formData.aliases}
                onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>チームを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{selectedTeam?.name}」を削除します。この操作は取り消せません。
              このチームに紐づく試合データがある場合、削除できません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminTeams() {
  return <AdminTeamsContent />;
}
