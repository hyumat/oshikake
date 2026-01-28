import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';

export function BillingStatus() {
  const { user } = useAuth();

  const { data, isLoading, error } = trpc.admin.getBillingEvents.useQuery(
    { limit: 5 },
    { enabled: user?.role === 'admin' }
  );

  if (user?.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            課金ステータス
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            課金ステータス
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">ステータスを取得できませんでした</p>
        </CardContent>
      </Card>
    );
  }

  const logs = data?.logs || [];
  const summary = data?.summary;

  const getEventBadge = (eventName: string) => {
    switch (eventName) {
      case 'payment_succeeded':
        return <Badge className="bg-green-100 text-green-800">支払成功</Badge>;
      case 'payment_failed':
        return <Badge className="bg-red-100 text-red-800">支払失敗</Badge>;
      case 'subscription_created':
        return <Badge className="bg-blue-100 text-blue-800">契約開始</Badge>;
      case 'subscription_updated':
        return <Badge className="bg-yellow-100 text-yellow-800">契約更新</Badge>;
      case 'subscription_deleted':
        return <Badge className="bg-gray-100 text-gray-800">契約終了</Badge>;
      default:
        return <Badge variant="secondary">{eventName}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className={summary?.hasRecentFailures ? 'border-yellow-300 bg-yellow-50' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {summary?.hasRecentFailures ? (
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          課金ステータス（管理者）
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">課金イベントがありません</p>
        ) : (
          <div className="space-y-2">
            {summary?.hasRecentFailures && (
              <div className="mb-2 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                直近{summary.failed}件の支払い失敗があります
              </div>
            )}
            {logs.slice(0, 3).map((log: any, index: number) => (
              <div
                key={log.id || index}
                className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  {getEventBadge(log.eventName)}
                  <span className="text-xs text-muted-foreground">
                    User #{log.userId}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
