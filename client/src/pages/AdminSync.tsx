/**
 * Issue #145: Google Sheets同期管理ページ
 *
 * 管理者用のGoogle Sheets同期状態監視と手動同期トリガー
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function AdminSync() {
  const [isSyncing, setIsSyncing] = useState(false);

  const utils = trpc.useUtils();

  // スケジューラーステータスを取得
  const { data: schedulerStatus, isLoading: isLoadingStatus } = trpc.matches.getSchedulerStatus.useQuery(undefined, {
    refetchInterval: 10000, // 10秒ごとに更新
  });

  // 同期ログを取得
  const { data: syncLogs, isLoading: isLoadingLogs } = trpc.matches.getSheetsSyncLogs.useQuery({ limit: 20 });

  // 手動同期を実行
  const syncMutation = trpc.matches.syncFromSheets.useMutation({
    onSuccess: (result) => {
      toast.success('同期完了', {
        description: result.message,
      });
      utils.matches.getSheetsSyncLogs.invalidate();
      utils.matches.getSchedulerStatus.invalidate();
      setIsSyncing(false);
    },
    onError: (error) => {
      toast.error('同期失敗', {
        description: error.message,
      });
      setIsSyncing(false);
    },
  });

  // スケジューラー経由で手動同期
  const triggerSchedulerSync = trpc.matches.triggerSchedulerSync.useMutation({
    onSuccess: () => {
      toast.success('同期開始', {
        description: 'スケジューラー経由で同期を開始しました',
      });
      // 少し遅延してステータスを更新
      setTimeout(() => {
        utils.matches.getSchedulerStatus.invalidate();
        utils.matches.getSheetsSyncLogs.invalidate();
      }, 2000);
    },
    onError: (error) => {
      toast.error('同期開始失敗', {
        description: error.message,
      });
    },
  });

  const handleManualSync = () => {
    setIsSyncing(true);
    syncMutation.mutate({ overwriteArchived: false });
  };

  const handleSchedulerSync = () => {
    triggerSchedulerSync.mutate();
  };

  const formatInterval = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}日`;
    if (hours > 0) return `${hours}時間`;
    if (minutes > 0) return `${minutes}分`;
    return `${seconds}秒`;
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />成功</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />失敗</Badge>;
      case 'partial':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />部分的</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Google Sheets同期管理</h1>
          <p className="text-muted-foreground mt-2">
            試合データの自動同期状態を監視し、手動同期を実行できます
          </p>
        </div>

        {/* スケジューラーステータス */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              自動同期スケジューラー
            </CardTitle>
            <CardDescription>
              定期的にGoogle Sheetsから試合データを自動同期します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingStatus ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">ステータスを読み込み中...</span>
              </div>
            ) : schedulerStatus?.enabled ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">稼働状態</div>
                    <div className="flex items-center gap-2">
                      {schedulerStatus.status?.isRunning ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="font-medium">実行中</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                          <span className="font-medium">停止中</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">同期間隔</div>
                    <div className="font-medium">
                      {formatInterval(schedulerStatus.config?.syncIntervalMs || 3600000)}ごと
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">次回同期</div>
                    <div className="font-medium">
                      {schedulerStatus.status?.nextSyncAt
                        ? formatDistanceToNow(new Date(schedulerStatus.status.nextSyncAt), {
                            addSuffix: true,
                            locale: ja,
                          })
                        : '未設定'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">最終同期</div>
                    <div className="font-medium">
                      {schedulerStatus.status?.lastSyncAt
                        ? formatDistanceToNow(new Date(schedulerStatus.status.lastSyncAt), {
                            addSuffix: true,
                            locale: ja,
                          })
                        : '未実行'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">成功回数</div>
                    <div className="font-medium text-green-600">
                      {schedulerStatus.status?.syncCount || 0}回
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">エラー回数</div>
                    <div className="font-medium text-red-600">
                      {schedulerStatus.status?.errorCount || 0}回
                    </div>
                  </div>
                </div>

                {schedulerStatus.status?.lastError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm font-medium text-red-800">最新のエラー</div>
                    <div className="text-sm text-red-600 mt-1">
                      {schedulerStatus.status.lastError}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSchedulerSync}
                    disabled={triggerSchedulerSync.isPending}
                    variant="outline"
                  >
                    {triggerSchedulerSync.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        実行中...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        スケジューラー経由で同期
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-900">スケジューラーが無効です</div>
                    <div className="text-sm text-yellow-700 mt-1">
                      環境変数 <code className="bg-yellow-100 px-1 rounded">SHEETS_SYNC_ENABLED</code>{' '}
                      または <code className="bg-yellow-100 px-1 rounded">GAS_API_URL</code>{' '}
                      が設定されていません。
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 手動同期 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              手動同期
            </CardTitle>
            <CardDescription>
              Google Sheetsから即座に試合データを同期します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleManualSync}
                disabled={isSyncing}
                size="lg"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    同期中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    今すぐ同期
                  </>
                )}
              </Button>
              <div className="text-sm text-muted-foreground">
                過去の試合結果は上書きされません
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 同期ログ履歴 */}
        <Card>
          <CardHeader>
            <CardTitle>同期履歴</CardTitle>
            <CardDescription>
              最近の同期実行履歴を表示します
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : syncLogs?.logs && syncLogs.logs.length > 0 ? (
              <div className="space-y-2">
                {syncLogs.logs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getSyncStatusBadge(log.status)}
                      <div>
                        <div className="font-medium">
                          {log.matchesCount}試合を取得
                          {log.resultsCount !== undefined && log.resultsCount > 0 && (
                            <span className="text-sm text-muted-foreground ml-2">
                              （結果確定: {log.resultsCount}件）
                            </span>
                          )}
                        </div>
                        {log.errorMessage && (
                          <div className="text-sm text-red-600 mt-1">
                            エラー: {log.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.syncedAt), {
                          addSuffix: true,
                          locale: ja,
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.durationMs}ms
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                同期履歴がありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
