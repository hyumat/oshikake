/**
 * Issue #77: Free プランの集計閲覧期間が終了した場合のペイウォール表示。
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { Link } from 'wouter';

interface StatsPaywallProps {
  expiresAt?: string | null;
}

export function StatsPaywall({ expiresAt }: StatsPaywallProps) {
  const expDate = expiresAt ? new Date(expiresAt) : null;
  const formattedDate = expDate
    ? `${expDate.getFullYear()}年${expDate.getMonth() + 1}月${expDate.getDate()}日`
    : '';

  return (
    <Card className="max-w-md mx-auto mt-12">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-3">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">集計の閲覧期間が終了しました</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Freeプランの集計閲覧期間（初回記録から1年間）が
          {formattedDate && `${formattedDate}に`}終了しました。
        </p>
        <p className="text-sm text-muted-foreground">
          記録データは保持されています。Plus/Proプランにアップグレードすると、集計を引き続き閲覧できます。
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/pricing">
            <Button className="w-full">料金プランを見る</Button>
          </Link>
          <Link href="/matches">
            <Button variant="ghost" className="w-full">
              観戦ログに戻る
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
