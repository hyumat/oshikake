import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Bell, Download, Palette, Shield, Loader2 } from "lucide-react";
import { useState } from "react";
import { canUseFeature, type Plan } from "@shared/billing";
import { ExportModal } from "@/components/ExportModal";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: supportedTeam, isLoading: teamLoading } = trpc.teams.getSupported.useQuery();
  const { data: allTeams } = trpc.teams.list.useQuery();
  const setSupportedMutation = trpc.teams.setSupported.useMutation({
    onSuccess: () => {
      toast.success("応援クラブを変更しました");
      utils.teams.getSupported.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "変更に失敗しました");
    },
  });

  if (!user) {
    return null;
  }

  const plan: Plan = (user.plan as Plan) || 'free';
  const planExpiresAt = user.planExpiresAt ? new Date(user.planExpiresAt) : null;
  const canExport = canUseFeature(plan, planExpiresAt, 'export');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          設定
        </h1>
        <p className="text-muted-foreground">アプリの設定を変更できます</p>
      </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              応援クラブ
            </CardTitle>
            <CardDescription>応援するJリーグクラブを設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">読み込み中...</span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>現在の応援クラブ</Label>
                  <Select
                    value={supportedTeam?.id?.toString() || ""}
                    onValueChange={(value) => {
                      setSupportedMutation.mutate({ teamId: Number(value) });
                    }}
                    disabled={setSupportedMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="クラブを選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTeams?.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  選択したクラブの試合予定・結果が表示されます
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              表示設定
            </CardTitle>
            <CardDescription>アプリの見た目を設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">ダークモード</Label>
                <p className="text-sm text-muted-foreground">
                  暗い配色に切り替えます
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
                disabled
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ※ダークモードは今後のアップデートで対応予定です
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              通知設定
            </CardTitle>
            <CardDescription>通知に関する設定</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">プッシュ通知</Label>
                <p className="text-sm text-muted-foreground">
                  試合情報の更新を通知します
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
                disabled
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ※通知機能は今後のアップデートで対応予定です
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              データエクスポート
              {!canExport && (
                <Badge variant="secondary" className="ml-2">Plus/Pro</Badge>
              )}
            </CardTitle>
            <CardDescription>観戦記録をCSV形式でダウンロード</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              これまでの観戦記録をCSV形式でエクスポートできます。
              家計簿アプリへの取り込みや、バックアップとしてご利用ください。
            </p>
            <Separator />
            {canExport ? (
              <Button onClick={() => setExportModalOpen(true)} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                CSVでエクスポート
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  データエクスポートはPlus/Proプランでご利用いただけます。
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/pricing">プランをアップグレード</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>アプリ情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">バージョン</span>
              <span>v0.1.1</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">お問い合わせ</span>
              <a href="/support" className="text-primary hover:underline">
                サポートページ
              </a>
            </div>
          </CardContent>
        </Card>

        <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} />
    </div>
  );
}
