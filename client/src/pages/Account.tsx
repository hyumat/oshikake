/**
 * Account Page
 * Issue #119: アカウントメニュー（ヘッダー）最小実装
 * Issue #108: アカウント設定ページ（Stripe決済管理追加）
 *
 * ユーザーの基本情報とアカウント設定を表示
 */

import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, CreditCard, Calendar, Shield, ExternalLink, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getPlanLabel, getPlanBadgeVariant, getSubscriptionStatusLabel, getSubscriptionStatusStyle } from "@shared/billing";

export default function Account() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Issue #108: Fetch subscription status
  const { data: subscriptionData, isLoading: subscriptionLoading } =
    trpc.billing.getSubscriptionStatus.useQuery();

  // Issue #108: Portal session mutation
  const portalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message || "カスタマーポータルの起動に失敗しました");
    },
  });

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

  // 日付フォーマット
  const formatDate = (date: Date | null) => {
    if (!date) return "未設定";
    return new Date(date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Issue #108: Subscription status icon based on shared style
  const getSubscriptionStatusIcon = (status: string) => {
    const style = getSubscriptionStatusStyle(status);
    switch (style) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "info":
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "neutral":
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleOpenPortal = () => {
    portalMutation.mutate();
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

            {/* Issue #108: Subscription status */}
            {subscriptionLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                サブスクリプション情報を読み込み中...
              </div>
            )}

            {!subscriptionLoading && subscriptionData?.subscription && (
              <>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getSubscriptionStatusIcon(subscriptionData.subscription.status)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">サブスクリプション状態</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getSubscriptionStatusLabel(subscriptionData.subscription.status)}
                    </p>
                  </div>
                </div>

                {subscriptionData.subscription.cancelAtPeriodEnd && (
                  <>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        このプランは{formatDate(subscriptionData.subscription.currentPeriodEnd)}に終了します。
                        終了後はFreeプランに移行します。
                      </AlertDescription>
                    </Alert>
                  </>
                )}

                {subscriptionData.subscription.currentPeriodEnd && !subscriptionData.subscription.cancelAtPeriodEnd && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">次回更新日</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(subscriptionData.subscription.currentPeriodEnd)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                <Separator />
              </>
            )}

            {/* プラン変更・お支払い管理ボタン */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {user.plan === "free" ? (
                <Button
                  variant="default"
                  onClick={() => navigate("/pricing")}
                  className="w-full sm:w-auto"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  プランをアップグレード
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleOpenPortal}
                    disabled={portalMutation.isPending || !subscriptionData?.subscription}
                    className="w-full sm:w-auto"
                  >
                    {portalMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        起動中...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        お支払い管理
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/pricing")}
                    className="w-full sm:w-auto"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    プラン変更
                  </Button>
                </>
              )}
            </div>

            {!subscriptionLoading && subscriptionData?.subscription && (
              <p className="text-xs text-muted-foreground">
                ※「お支払い管理」からサブスクリプションの解約、請求履歴の確認、支払い方法の変更ができます
              </p>
            )}
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
