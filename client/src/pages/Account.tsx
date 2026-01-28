import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar, Crown, LogOut, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { getPlanDisplayName, type Plan } from "@shared/billing";

export default function Account() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  if (!user) {
    return null;
  }

  const plan: Plan = (user.plan as Plan) || 'free';
  const planName = getPlanDisplayName(plan);
  
  const planBadgeVariant = plan === 'pro' 
    ? 'default' 
    : plan === 'plus' 
      ? 'secondary' 
      : 'outline';

  const formatDate = (dateValue: string | Date | null | undefined) => {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">アカウント</h1>
        <p className="text-muted-foreground">アカウント情報の確認</p>
      </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              プロフィール
            </CardTitle>
            <CardDescription>基本情報</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">名前</span>
              </div>
              <span className="font-medium">{user.name || "未設定"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">メールアドレス</span>
              </div>
              <span className="font-medium">{user.email || "未設定"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">登録日</span>
              </div>
              <span className="font-medium">{formatDate(user.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              プラン
            </CardTitle>
            <CardDescription>現在のご契約プラン</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">現在のプラン</span>
              <Badge variant={planBadgeVariant}>{planName}</Badge>
            </div>
            {user.planExpiresAt && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">有効期限</span>
                  <span className="font-medium">{formatDate(user.planExpiresAt)}</span>
                </div>
              </>
            )}
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/pricing")}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                プランを変更
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              ログアウト
            </CardTitle>
            <CardDescription>アカウントからログアウトします</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}
