import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';

export function SyncStatus() {
  const { user } = useAuth();
  
  const { data, isLoading, error } = trpc.matches.getSheetsSyncLogs.useQuery(
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
            <RefreshCw className="h-4 w-4 animate-spin" />
            同期ステータス
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
            <AlertCircle className="h-4 w-4" />
            同期ステータス
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">ステータスを取得できませんでした</p>
        </CardContent>
      </Card>
    );
  }

  const logs = data?.logs || [];
  const latestLog = logs[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">成功</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">一部成功</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">失敗</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {latestLog?.status === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : latestLog?.status === 'failed' ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          )}
          同期ステータス（管理者）
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">同期履歴がありません</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 3).map((log: any, index: number) => (
              <div
                key={log.id || index}
                className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  {getStatusBadge(log.status)}
                  <span className="text-muted-foreground">
                    {log.matchesCount}件
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(log.syncedAt)}
                </span>
              </div>
            ))}
            {latestLog?.errorMessage && (
              <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                {latestLog.errorMessage}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
