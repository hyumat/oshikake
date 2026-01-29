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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  Shield,
  Database,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Activity,
  Gauge,
  Clock,
} from "lucide-react";

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  variant = "default",
  iconBg = "bg-slate-100"
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  subValue?: string;
  variant?: "default" | "success" | "warning" | "error";
  iconBg?: string;
}) {
  const valueColors = {
    default: "text-slate-900",
    success: "text-emerald-600",
    warning: "text-amber-600",
    error: "text-red-600"
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${iconBg}`}>
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${valueColors[variant]}`}>{value}</p>
        {subValue && (
          <p className="text-xs text-slate-400 mt-1">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function SystemStatusCard() {
  const { data, isLoading, refetch } = trpc.admin.getSystemStatus.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">システム概要</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const status = data?.status;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">システム概要</h2>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-slate-500 hover:text-slate-700">
          <RefreshCw className="h-4 w-4 mr-1" />
          更新
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Database}
          label="データベース"
          value={status?.database === 'connected' ? '正常稼働' : 'エラー'}
          variant={status?.database === 'connected' ? 'success' : 'error'}
          iconBg="bg-emerald-50"
        />
        <StatCard
          icon={Users}
          label="登録ユーザー"
          value={status?.userCount || 0}
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={Calendar}
          label="試合データ"
          value={status?.matchCount || 0}
          iconBg="bg-indigo-50"
        />
        <StatCard
          icon={CheckCircle}
          label="観戦記録"
          value={status?.attendanceCount || 0}
          iconBg="bg-purple-50"
        />
        <StatCard
          icon={RefreshCw}
          label="最終同期"
          value={status?.lastSyncStatus === 'success' ? '成功' : status?.lastSyncStatus === 'failed' ? '失敗' : '未実行'}
          subValue={status?.lastSync ? new Date(status.lastSync).toLocaleString('ja-JP') : undefined}
          variant={status?.lastSyncStatus === 'success' ? 'success' : status?.lastSyncStatus === 'failed' ? 'error' : 'default'}
          iconBg="bg-cyan-50"
        />
        <StatCard
          icon={AlertTriangle}
          label="24時間エラー"
          value={status?.recentErrors || 0}
          variant={Number(status?.recentErrors) > 0 ? 'error' : 'success'}
          iconBg={Number(status?.recentErrors) > 0 ? "bg-red-50" : "bg-slate-100"}
        />
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color = "bg-indigo-500" }: { value: number; max: number; color?: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-500`} 
        style={{ width: `${percentage}%` }} 
      />
    </div>
  );
}

function DataQualityCard() {
  const { data, isLoading, refetch } = trpc.admin.getDataQuality.useQuery();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-900">データ品質</h3>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
    );
  }

  const quality = data?.quality;
  const totalMissing = (Number(quality?.missingKickoff) || 0) + 
                       (Number(quality?.missingStadium) || 0) + 
                       (Number(quality?.missingTicketSales) || 0) + 
                       (Number(quality?.missingResults) || 0);
  const hasIssues = totalMissing > 0 || (Number(quality?.inconsistencies) || 0) > 0;
  const maxIssues = Math.max(totalMissing + (Number(quality?.inconsistencies) || 0), 1);

  const qualityItems = [
    { label: "KO未設定", value: Number(quality?.missingKickoff) || 0, icon: Clock, color: "bg-amber-500" },
    { label: "会場未設定", value: Number(quality?.missingStadium) || 0, icon: Database, color: "bg-amber-500" },
    { label: "発売日未入力", value: Number(quality?.missingTicketSales) || 0, icon: Calendar, color: "bg-amber-500" },
    { label: "結果未入力", value: Number(quality?.missingResults) || 0, icon: XCircle, color: "bg-orange-500" },
    { label: "データ矛盾", value: Number(quality?.inconsistencies) || 0, icon: AlertTriangle, color: "bg-red-500" },
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {hasIssues ? (
            <div className="p-2 rounded-lg bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-emerald-50">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-slate-900">データ品質</h3>
            <p className="text-sm text-slate-500">未入力項目と整合性チェック</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-slate-500 hover:text-slate-700">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {qualityItems.map((item) => {
          const Icon = item.icon;
          const hasValue = item.value > 0;
          return (
            <div key={item.label} className="flex items-center gap-4">
              <div className={`p-1.5 rounded ${hasValue ? 'bg-slate-100' : 'bg-emerald-50'}`}>
                <Icon className={`h-4 w-4 ${hasValue ? 'text-slate-500' : 'text-emerald-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <span className={`text-sm font-bold ${hasValue ? 'text-slate-900' : 'text-emerald-600'}`}>
                    {item.value}件
                  </span>
                </div>
                <ProgressBar 
                  value={item.value} 
                  max={maxIssues} 
                  color={hasValue ? item.color : "bg-emerald-500"} 
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>最終更新:</span>
          <span className="font-medium text-slate-700">
            {quality?.lastUpdate
              ? new Date(quality.lastUpdate).toLocaleString('ja-JP')
              : '未更新'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" />
          <span>最終インポート:</span>
          <span className="font-medium text-slate-700">
            {quality?.lastCsvImport
              ? new Date(quality.lastCsvImport).toLocaleString('ja-JP')
              : 'なし'}
          </span>
        </div>
      </div>
    </div>
  );
}

function NavigationCards() {
  const [, navigate] = useLocation();

  const navItems = [
    {
      title: "試合データ管理",
      description: "試合情報の追加・編集・インポート",
      icon: Calendar,
      path: "/admin/matches",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      hoverBg: "hover:bg-indigo-50",
    },
    {
      title: "チーム管理",
      description: "チームの追加・編集・有効化",
      icon: Users,
      path: "/admin/teams",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      hoverBg: "hover:bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left transition-all duration-200 ${item.hoverBg} hover:shadow-md hover:border-gray-200 group`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${item.iconBg} transition-transform group-hover:scale-110`}>
                <Icon className={`h-6 w-6 ${item.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 group-hover:text-slate-700">{item.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{item.description}</p>
              </div>
              <div className="text-slate-300 group-hover:text-slate-400 group-hover:translate-x-1 transition-all">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function UserManagementTab() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<string>("free");
  const [planExpiry, setPlanExpiry] = useState<string>("");

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.getUsers.useQuery({
    limit: 50,
    search: search || undefined,
    plan: planFilter !== "all" ? (planFilter as "free" | "plus" | "pro") : undefined,
  });

  const updatePlanMutation = trpc.admin.updateUserPlan.useMutation({
    onSuccess: () => {
      toast.success("プランを更新しました");
      setIsEditOpen(false);
      setSelectedUser(null);
      utils.admin.getUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "更新に失敗しました");
    },
  });

  const handleEditPlan = (user: any) => {
    setSelectedUser(user);
    setNewPlan(user.plan);
    setPlanExpiry(user.planExpiresAt ? new Date(user.planExpiresAt).toISOString().split('T')[0] : "");
    setIsEditOpen(true);
  };

  const handleUpdatePlan = () => {
    if (!selectedUser) return;
    updatePlanMutation.mutate({
      userId: selectedUser.id,
      plan: newPlan as "free" | "plus" | "pro",
      planExpiresAt: planExpiry || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="名前またはメールで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="プラン" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全プラン</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="plus">Plus</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ユーザー</TableHead>
                <TableHead>プラン</TableHead>
                <TableHead>有効期限</TableHead>
                <TableHead>最終ログイン</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name || "未設定"}</div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.plan === 'pro' ? 'default' : user.plan === 'plus' ? 'secondary' : 'outline'}
                    >
                      {user.plan.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.planExpiresAt
                      ? new Date(user.planExpiresAt).toLocaleDateString('ja-JP')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(user.lastSignedIn).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditPlan(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プラン変更</DialogTitle>
            <DialogDescription>
              {selectedUser?.name || selectedUser?.email} のプランを変更します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>プラン</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="plus">Plus</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>有効期限（任意）</Label>
              <Input
                type="date"
                value={planExpiry}
                onChange={(e) => setPlanExpiry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdatePlan} disabled={updatePlanMutation.isPending}>
              {updatePlanMutation.isPending ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "info" as "info" | "warning" | "success" | "error",
    startsAt: "",
    endsAt: "",
  });

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.getAnnouncements.useQuery({
    includeInactive: true,
  });

  const createMutation = trpc.admin.createAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("お知らせを作成しました");
      setIsCreateOpen(false);
      setFormData({ title: "", content: "", type: "info", startsAt: "", endsAt: "" });
      utils.admin.getAnnouncements.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "作成に失敗しました");
    },
  });

  const updateMutation = trpc.admin.updateAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("お知らせを更新しました");
      setIsEditOpen(false);
      setSelectedAnnouncement(null);
      utils.admin.getAnnouncements.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "更新に失敗しました");
    },
  });

  const deleteMutation = trpc.admin.deleteAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("お知らせを削除しました");
      setIsDeleteOpen(false);
      setSelectedAnnouncement(null);
      utils.admin.getAnnouncements.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "削除に失敗しました");
    },
  });

  const handleCreate = () => {
    if (!formData.title || !formData.content) {
      toast.error("タイトルと内容を入力してください");
      return;
    }
    createMutation.mutate({
      ...formData,
      startsAt: formData.startsAt || undefined,
      endsAt: formData.endsAt || undefined,
    });
  };

  const handleEdit = (announcement: any) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      startsAt: announcement.startsAt ? new Date(announcement.startsAt).toISOString().split('T')[0] : "",
      endsAt: announcement.endsAt ? new Date(announcement.endsAt).toISOString().split('T')[0] : "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedAnnouncement) return;
    updateMutation.mutate({
      id: selectedAnnouncement.id,
      ...formData,
      startsAt: formData.startsAt || null,
      endsAt: formData.endsAt || null,
    });
  };

  const handleToggleActive = (announcement: any) => {
    updateMutation.mutate({
      id: announcement.id,
      isActive: !announcement.isActive,
    });
  };

  const typeColors = {
    info: "bg-blue-100 text-blue-800",
    warning: "bg-yellow-100 text-yellow-800",
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => {
          setFormData({ title: "", content: "", type: "info", startsAt: "", endsAt: "" });
          setIsCreateOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          お知らせを作成
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {data?.announcements.map((announcement) => (
            <Card key={announcement.id} className={!announcement.isActive ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={typeColors[announcement.type as keyof typeof typeColors]}>
                      {announcement.type}
                    </Badge>
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    {!announcement.isActive && (
                      <Badge variant="outline">非公開</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(announcement)}
                    >
                      {announcement.isActive ? "非公開にする" : "公開する"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(announcement)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedAnnouncement(announcement);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{announcement.content}</p>
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span>作成: {new Date(announcement.createdAt).toLocaleDateString('ja-JP')}</span>
                  {announcement.startsAt && (
                    <span>開始: {new Date(announcement.startsAt).toLocaleDateString('ja-JP')}</span>
                  )}
                  {announcement.endsAt && (
                    <span>終了: {new Date(announcement.endsAt).toLocaleDateString('ja-JP')}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {data?.announcements.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              お知らせはありません
            </div>
          )}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>お知らせを作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>タイトル</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="お知らせのタイトル"
              />
            </div>
            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="お知らせの内容"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>タイプ</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始日（任意）</Label>
                <Input
                  type="date"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>終了日（任意）</Label>
                <Input
                  type="date"
                  value={formData.endsAt}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                />
              </div>
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
            <DialogTitle>お知らせを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>タイトル</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>タイプ</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始日</Label>
                <Input
                  type="date"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>終了日</Label>
                <Input
                  type="date"
                  value={formData.endsAt}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                />
              </div>
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
            <AlertDialogTitle>お知らせを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{selectedAnnouncement?.title}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedAnnouncement && deleteMutation.mutate({ id: selectedAnnouncement.id })}
              className="bg-red-600 hover:bg-red-700"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ApiPerformanceTab() {
  const { data, isLoading, refetch } = trpc.admin.getApiPerformance.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          更新
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Gauge className="h-4 w-4" />
              総コール数
            </div>
            <div className="text-2xl font-bold">{stats?.totalCalls || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Clock className="h-4 w-4" />
              平均応答
            </div>
            <div className="text-2xl font-bold">{stats?.avgDuration || 0}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <AlertTriangle className="h-4 w-4" />
              遅延コール
            </div>
            <div className="text-2xl font-bold text-orange-500">{stats?.slowCalls || 0}</div>
            <div className="text-xs text-slate-500">&gt;1000ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <XCircle className="h-4 w-4" />
              エラー率
            </div>
            <div className={`text-2xl font-bold ${(stats?.errorRate || 0) > 5 ? 'text-red-500' : ''}`}>
              {stats?.errorRate || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">パーセンタイル</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-sm text-slate-500">P50</div>
              <div className="text-xl font-semibold">{stats?.p50Duration || 0}ms</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">P95</div>
              <div className="text-xl font-semibold">{stats?.p95Duration || 0}ms</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">P99</div>
              <div className="text-xl font-semibold">{stats?.p99Duration || 0}ms</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">エンドポイント別統計</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.byPath && Object.keys(stats.byPath).length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>パス</TableHead>
                    <TableHead className="text-right">コール数</TableHead>
                    <TableHead className="text-right">平均ms</TableHead>
                    <TableHead className="text-right">エラー</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(stats.byPath)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 20)
                    .map(([path, pathStats]) => (
                      <TableRow key={path}>
                        <TableCell className="font-mono text-sm">{path}</TableCell>
                        <TableCell className="text-right">{pathStats.count}</TableCell>
                        <TableCell className={`text-right ${pathStats.avgDuration > 500 ? 'text-orange-500' : ''}`}>
                          {pathStats.avgDuration}
                        </TableCell>
                        <TableCell className={`text-right ${pathStats.errorCount > 0 ? 'text-red-500' : ''}`}>
                          {pathStats.errorCount}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              データがありません
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">最近のAPIコール</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentMetrics && data.recentMetrics.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.recentMetrics.slice().reverse().map((metric, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={metric.status === 'error' ? 'destructive' : 'secondary'}>
                      {metric.status}
                    </Badge>
                    <span className="font-mono text-sm">{metric.path}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={metric.duration > 500 ? 'text-orange-500' : 'text-slate-600'}>
                      {metric.duration}ms
                    </span>
                    <span className="text-slate-400 text-xs">
                      {new Date(metric.timestamp).toLocaleTimeString('ja-JP')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              データがありません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorLogsTab() {
  const [eventFilter, setEventFilter] = useState<string>("all");

  const { data, isLoading, refetch } = trpc.admin.getEventLogs.useQuery({
    limit: 50,
    eventName: eventFilter !== "all" ? eventFilter : undefined,
  });

  const eventTypes = [
    { value: "all", label: "すべて" },
    { value: "payment_failed", label: "決済失敗" },
    { value: "payment_succeeded", label: "決済成功" },
    { value: "subscription_created", label: "サブスク作成" },
    { value: "subscription_updated", label: "サブスク更新" },
    { value: "subscription_deleted", label: "サブスク削除" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="イベントタイプ" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          更新
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data?.logs.map((log) => (
            <Card key={log.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={log.eventName.includes('failed') ? 'destructive' : 'secondary'}
                    >
                      {log.eventName}
                    </Badge>
                    <span className="text-sm text-slate-500">
                      User ID: {log.userId || 'N/A'}
                    </span>
                  </div>
                  {log.eventData && (
                    <pre className="text-xs text-slate-600 mt-2 p-2 bg-slate-50 rounded overflow-x-auto">
                      {JSON.stringify(log.eventData, null, 2)}
                    </pre>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString('ja-JP')}
                </span>
              </div>
            </Card>
          ))}
          {data?.logs.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              ログはありません
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminConsole() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
        <p className="text-slate-500 mt-1">
          システムの運用状況とデータ管理
        </p>
      </div>

      <NavigationCards />

      <SystemStatusCard />

      <DataQualityCard />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <Tabs defaultValue="users" className="w-full">
          <div className="border-b border-gray-100 px-6 pt-4">
            <TabsList className="bg-transparent p-0 h-auto gap-6">
              <TabsTrigger 
                value="users" 
                className="flex items-center gap-2 px-1 pb-3 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-indigo-600"
              >
                <Users className="h-4 w-4" />
                ユーザー管理
              </TabsTrigger>
              <TabsTrigger 
                value="announcements" 
                className="flex items-center gap-2 px-1 pb-3 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-indigo-600"
              >
                <Megaphone className="h-4 w-4" />
                お知らせ
              </TabsTrigger>
              <TabsTrigger 
                value="performance" 
                className="flex items-center gap-2 px-1 pb-3 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-indigo-600"
              >
                <Gauge className="h-4 w-4" />
                API性能
              </TabsTrigger>
              <TabsTrigger 
                value="logs" 
                className="flex items-center gap-2 px-1 pb-3 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-indigo-600"
              >
                <AlertTriangle className="h-4 w-4" />
                イベントログ
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="p-6 mt-0">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">ユーザー管理</h3>
              <p className="text-sm text-slate-500">ユーザーのプランを手動で変更できます</p>
            </div>
            <UserManagementTab />
          </TabsContent>

          <TabsContent value="announcements" className="p-6 mt-0">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">お知らせ管理</h3>
              <p className="text-sm text-slate-500">ユーザーへのお知らせを作成・管理します</p>
            </div>
            <AnnouncementsTab />
          </TabsContent>

          <TabsContent value="performance" className="p-6 mt-0">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">APIパフォーマンス</h3>
              <p className="text-sm text-slate-500">API応答時間とエラー率を監視します</p>
            </div>
            <ApiPerformanceTab />
          </TabsContent>

          <TabsContent value="logs" className="p-6 mt-0">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">イベントログ</h3>
              <p className="text-sm text-slate-500">システムイベントとエラーを確認します</p>
            </div>
            <ErrorLogsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
