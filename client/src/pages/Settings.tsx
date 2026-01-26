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
import { Settings as SettingsIcon, Save, Home, Palette, Database, Wallet, Plus, Trash2, Edit2, GripVertical, Lock, Crown } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

  // Issue #109: Custom categories state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id?: number; name: string; icon?: string; color?: string } | null>(null);

  // Issue #109: Get user plan and custom categories
  const { data: planStatus } = trpc.userMatches.getPlanStatus.useQuery();
  const { data: categoriesData, refetch: refetchCategories } = trpc.categories.list.useQuery();

  const isPro = planStatus?.isPro ?? false;

  // Issue #109: Category mutations
  const createCategoryMutation = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast.success('カテゴリを作成しました');
      refetchCategories();
      setShowCategoryDialog(false);
      setEditingCategory(null);
    },
    onError: (error) => {
      toast.error(error.message || 'カテゴリの作成に失敗しました');
    },
  });

  const updateCategoryMutation = trpc.categories.update.useMutation({
    onSuccess: () => {
      toast.success('カテゴリを更新しました');
      refetchCategories();
      setShowCategoryDialog(false);
      setEditingCategory(null);
    },
    onError: (error) => {
      toast.error(error.message || 'カテゴリの更新に失敗しました');
    },
  });

  const deleteCategoryMutation = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success('カテゴリを削除しました');
      refetchCategories();
    },
    onError: (error) => {
      toast.error(error.message || 'カテゴリの削除に失敗しました');
    },
  });

  const handleSaveCategory = () => {
    if (!editingCategory?.name) {
      toast.error('カテゴリ名を入力してください');
      return;
    }

    if (editingCategory.id) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        name: editingCategory.name,
        icon: editingCategory.icon,
        color: editingCategory.color,
      });
    } else {
      createCategoryMutation.mutate({
        name: editingCategory.name,
        icon: editingCategory.icon,
        color: editingCategory.color,
      });
    }
  };

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

          {/* Issue #109: Custom Categories (Pro-only) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  <CardTitle>カスタムカテゴリ</CardTitle>
                  {isPro && <Crown className="h-4 w-4 text-yellow-500" />}
                </div>
                {!isPro && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>Pro限定</span>
                  </div>
                )}
              </div>
              <CardDescription>
                {isPro
                  ? '独自の支出カテゴリを作成・管理できます'
                  : 'Pro限定機能：独自の支出カテゴリを作成できます'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isPro ? (
                <div className="p-4 border-2 border-dashed rounded-lg text-center space-y-3">
                  <Lock className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    カスタムカテゴリ機能はProプラン限定です
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.location.href = '/billing'}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Proにアップグレード
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {categoriesData?.categories?.length || 0}個のカスタムカテゴリ
                    </p>
                    <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCategory({ name: '' })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          カテゴリ追加
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingCategory?.id ? 'カテゴリ編集' : 'カテゴリ追加'}
                          </DialogTitle>
                          <DialogDescription>
                            カスタムカテゴリの名前を入力してください
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="categoryName">カテゴリ名</Label>
                            <Input
                              id="categoryName"
                              placeholder="例: ユニフォーム"
                              value={editingCategory?.name || ''}
                              onChange={(e) => setEditingCategory(prev =>
                                prev ? { ...prev, name: e.target.value } : null
                              )}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowCategoryDialog(false);
                              setEditingCategory(null);
                            }}
                          >
                            キャンセル
                          </Button>
                          <Button
                            onClick={handleSaveCategory}
                            disabled={!editingCategory?.name}
                          >
                            {editingCategory?.id ? '更新' : '作成'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {categoriesData?.categories && categoriesData.categories.length > 0 && (
                    <div className="space-y-2">
                      {categoriesData.categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingCategory({
                                  id: category.id,
                                  name: category.name,
                                  icon: category.icon || undefined,
                                  color: category.color || undefined,
                                });
                                setShowCategoryDialog(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`「${category.name}」を削除しますか？`)) {
                                  deleteCategoryMutation.mutate({ id: category.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
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
