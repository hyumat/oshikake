import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Save, Home, Palette, Database, Wallet } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect } from "react";

export default function Settings() {
  const { user } = useAuth();
  const { theme: currentTheme, setTheme } = useTheme();
  const [homeTeam, setHomeTeam] = useState<string>(() => {
    return localStorage.getItem("settings.homeTeam") || "yokohama-f-marinos";
  });
  const [theme, setLocalTheme] = useState<string>(currentTheme);
  const [seasonBudget, setSeasonBudget] = useState<string>(() => {
    return localStorage.getItem("settings.seasonBudget") || "";
  });
  const [matchBudget, setMatchBudget] = useState<string>(() => {
    return localStorage.getItem("settings.matchBudget") || "";
  });

  // Sync theme with ThemeContext
  useEffect(() => {
    setLocalTheme(currentTheme);
  }, [currentTheme]);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem("settings.homeTeam", homeTeam);
    localStorage.setItem("settings.seasonBudget", seasonBudget);
    localStorage.setItem("settings.matchBudget", matchBudget);

    // Apply theme change
    if (setTheme && theme !== currentTheme) {
      setTheme(theme as "light" | "dark");
    }

    toast.success("設定を保存しました");
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            設定
          </h1>
          <p className="text-muted-foreground">
            アプリケーションの設定を管理します
          </p>
        </div>

        <div className="space-y-6">
          {/* アカウント情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                アカウント情報
              </CardTitle>
              <CardDescription>
                現在ログイン中のアカウント情報
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ユーザー名</Label>
                <Input value={user?.name || "-"} disabled />
              </div>
              <div className="space-y-2">
                <Label>メールアドレス</Label>
                <Input value={user?.email || "-"} disabled />
              </div>
            </CardContent>
          </Card>

          {/* ホームチーム設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                ホームチーム
              </CardTitle>
              <CardDescription>
                応援するチームを選択してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="homeTeam">ホームチーム</Label>
                <Select value={homeTeam} onValueChange={setHomeTeam}>
                  <SelectTrigger id="homeTeam">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yokohama-f-marinos">
                      横浜F・マリノス
                    </SelectItem>
                    <SelectItem value="other">その他（準備中）</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  MVPでは横浜F・マリノスのみ対応しています
                </p>
              </div>
            </CardContent>
          </Card>

          {/* テーマ設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                テーマ
              </CardTitle>
              <CardDescription>
                アプリの表示テーマを選択してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">テーマ</Label>
                <Select value={theme} onValueChange={setLocalTheme}>
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">ライト</SelectItem>
                    <SelectItem value="dark">ダーク</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  保存するとテーマが適用されます
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 予算設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                予算管理
              </CardTitle>
              <CardDescription>
                シーズンごとの予算と試合ごとの予算を設定できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seasonBudget">シーズン予算（円）</Label>
                <Input
                  id="seasonBudget"
                  type="number"
                  placeholder="例: 200000"
                  value={seasonBudget}
                  onChange={(e) => setSeasonBudget(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  シーズン全体で使用する予算額を設定します
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="matchBudget">試合ごとの目安予算（円）</Label>
                <Input
                  id="matchBudget"
                  type="number"
                  placeholder="例: 10000"
                  value={matchBudget}
                  onChange={(e) => setMatchBudget(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  1試合あたりの予算目安を設定します
                </p>
              </div>
            </CardContent>
          </Card>

          {/* データ管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                データ管理
              </CardTitle>
              <CardDescription>
                データのインポート・エクスポート
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>データエクスポート</Label>
                <Button variant="outline" className="w-full" disabled>
                  CSVでエクスポート（準備中）
                </Button>
                <p className="text-sm text-muted-foreground">
                  観戦記録をCSVファイルでダウンロードできます
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>データインポート</Label>
                <Button variant="outline" className="w-full" disabled>
                  CSVでインポート（準備中）
                </Button>
                <p className="text-sm text-muted-foreground">
                  過去のデータをCSVファイルから取り込めます
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 保存ボタン */}
          <div className="flex justify-end gap-2">
            <Button variant="outline">キャンセル</Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              保存する
            </Button>
          </div>

          {/* サポート・リーガルリンク */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 text-sm">
                <a
                  href="/support"
                  className="text-primary hover:underline"
                >
                  お問い合わせ
                </a>
                <a
                  href="/terms"
                  className="text-primary hover:underline"
                >
                  利用規約
                </a>
                <a
                  href="/privacy"
                  className="text-primary hover:underline"
                >
                  プライバシーポリシー
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
