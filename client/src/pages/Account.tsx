/**
 * Account Page
 * Issue #119: アカウントメニュー（ヘッダー）最小実装
 *
 * ユーザーの基本情報とアカウント設定を表示
 */

import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, CreditCard, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Account() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="mb-6">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  // プラン名を日本語に変換
  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case "free":
        return "無料プラン";
      case "plus":
        return "Plusプラン";
      case "pro":
        return "Proプラン";
      default:
        return plan;
    }
  };

  // プランのバッジカラー
  const getPlanBadgeVariant = (plan: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (plan) {
      case "free":
        return "secondary";
      case "plus":
        return "default";
      case "pro":
        return "destructive";
      default:
        return "outline";
    }
  };

  // 日付フォーマット
  const formatDate = (date: Date | null) => {
    if (!date) return "未設定";
    return new Date(date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">アカウント</h1>
          <p className="text-muted-foreground mt-2">
            アカウント情報とプランの管理
          </p>
        </div>

        {/* アカウント情報 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>
              ログインしているアカウントの情報です
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 名前 */}
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">名前</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.name || "未設定"}
                </p>
              </div>
            </div>

            <Separator />

            {/* メールアドレス */}
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">メールアドレス</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.email || "未設定"}
                </p>
              </div>
            </div>

            <Separator />

            {/* 権限 */}
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">権限</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.role === "admin" ? "管理者" : "一般ユーザー"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* プラン情報 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              プラン情報
              <Badge variant={getPlanBadgeVariant(user.plan)}>
                {getPlanLabel(user.plan)}
              </Badge>
            </CardTitle>
            <CardDescription>
              現在のプランと有効期限
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* プラン */}
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">現在のプラン</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getPlanLabel(user.plan)}
                </p>
              </div>
            </div>

            {user.planExpiresAt && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">有効期限</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(user.planExpiresAt)}
                    </p>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* プラン変更ボタン */}
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => navigate("/pricing")}
                className="w-full sm:w-auto"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                プラン変更・お支払い
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* アカウント作成日 */}
        <Card>
          <CardHeader>
            <CardTitle>利用状況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">アカウント作成日</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">最終ログイン</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(user.lastSignedIn)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
