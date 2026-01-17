/**
 * Issue #123: Admin page for perform_id ticket mapping
 * Semi-automatic mapping of matches to J.LEAGUE ticket system perform_ids
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Check, X, Ticket, Calendar, MapPin } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { formatDateTime } from '@shared/formatters';

interface PerformIdInput {
  [matchId: string]: string;
}

export default function AdminTicketMapping() {
  const [performIdInputs, setPerformIdInputs] = useState<PerformIdInput>({});

  // Queries
  const {
    data: needsMappingData,
    isLoading: isLoadingNeedsMapping,
    refetch: refetchNeedsMapping
  } = trpc.admin.getMatchesForMapping.useQuery();

  const {
    data: approvedData,
    isLoading: isLoadingApproved,
    refetch: refetchApproved
  } = trpc.admin.getApprovedMappings.useQuery();

  // Mutations
  const saveMappingMutation = trpc.admin.savePerformIdMapping.useMutation({
    onSuccess: (data) => {
      toast.success(`perform_id を${data.status === 'approved' ? '承認' : '提案'}しました`);
      refetchNeedsMapping();
      refetchApproved();
      // Clear input after save
      setPerformIdInputs(prev => {
        const updated = { ...prev };
        delete updated[data.matchId];
        return updated;
      });
    },
    onError: (error) => {
      toast.error(`保存に失敗しました: ${error.message}`);
    },
  });

  const deleteMappingMutation = trpc.admin.deletePerformIdMapping.useMutation({
    onSuccess: () => {
      toast.success('perform_id を削除しました');
      refetchNeedsMapping();
      refetchApproved();
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });

  const handleInputChange = (matchId: string, value: string) => {
    setPerformIdInputs(prev => ({
      ...prev,
      [matchId]: value,
    }));
  };

  const handleSave = (matchId: string, status: 'suggested' | 'approved') => {
    const performId = performIdInputs[matchId]?.trim();
    if (!performId) {
      toast.error('perform_id を入力してください');
      return;
    }

    saveMappingMutation.mutate({
      matchId,
      performId,
      status,
    });
  };

  const handleDelete = (matchId: string) => {
    if (confirm('この perform_id マッピングを削除してもよろしいですか？')) {
      deleteMappingMutation.mutate({ matchId });
    }
  };

  const getVenueBadge = (marinosSide?: 'home' | 'away') => {
    if (marinosSide === 'home') {
      return <Badge className="bg-blue-600">HOME</Badge>;
    }
    if (marinosSide === 'away') {
      return <Badge className="bg-red-600">AWAY</Badge>;
    }
    return <Badge variant="secondary">OTHER</Badge>;
  };

  const getStatusBadge = (status?: 'suggested' | 'approved' | null) => {
    if (status === 'approved') {
      return <Badge className="bg-green-600">承認済み</Badge>;
    }
    if (status === 'suggested') {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">候補</Badge>;
    }
    return <Badge variant="secondary">未設定</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Ticket className="h-8 w-8" />
            チケットマッピング管理
          </h1>
          <p className="text-muted-foreground">
            J.LEAGUE チケットシステムの perform_id を試合にマッピングします（将来の自動化用）
          </p>
        </div>

        <div className="space-y-6">
          {/* マッピングが必要な試合 */}
          <Card>
            <CardHeader>
              <CardTitle>マッピングが必要な試合</CardTitle>
              <CardDescription>
                未来の試合で perform_id が未設定または候補状態のもの
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingNeedsMapping ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : needsMappingData && needsMappingData.matches.length > 0 ? (
                <div className="space-y-4">
                  {needsMappingData.matches.map((match) => (
                    <Card key={match.id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex flex-col gap-3">
                          {/* 試合情報 */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                {getVenueBadge(match.marinosSide ?? undefined)}
                                {match.competition && (
                                  <Badge variant="outline">{match.competition}</Badge>
                                )}
                                {getStatusBadge(match.performIdStatus ?? undefined)}
                              </div>
                              <div className="font-medium">vs {match.opponent}</div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateTime(match.date, 'short')}
                                </span>
                                {match.stadium && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {match.stadium}
                                  </span>
                                )}
                              </div>
                              {match.notes && (
                                <div className="text-sm text-muted-foreground">
                                  備考: {match.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* perform_id 入力・操作 */}
                          <div className="space-y-3">
                            {match.performId && match.performIdStatus ? (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm">現在の perform_id:</Label>
                                  <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                                    {match.performId}
                                  </code>
                                </div>
                                <div className="flex gap-2">
                                  {match.performIdStatus === 'suggested' && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleSave(match.matchId, 'approved')}
                                      disabled={saveMappingMutation.isPending}
                                    >
                                      <Check className="mr-1 h-3 w-3" />
                                      承認
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(match.matchId)}
                                    disabled={deleteMappingMutation.isPending}
                                  >
                                    <X className="mr-1 h-3 w-3" />
                                    削除
                                  </Button>
                                </div>
                              </div>
                            ) : null}

                            <div className="flex items-end gap-2">
                              <div className="flex-1 space-y-1">
                                <Label htmlFor={`perform-id-${match.id}`} className="text-sm">
                                  perform_id を入力
                                </Label>
                                <Input
                                  id={`perform-id-${match.id}`}
                                  placeholder="例: 2025_j1_01_home"
                                  value={performIdInputs[match.matchId] || match.performId || ''}
                                  onChange={(e) => handleInputChange(match.matchId, e.target.value)}
                                  className="font-mono text-sm"
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSave(match.matchId, 'suggested')}
                                disabled={saveMappingMutation.isPending || !performIdInputs[match.matchId]}
                              >
                                候補として保存
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSave(match.matchId, 'approved')}
                                disabled={saveMappingMutation.isPending || !performIdInputs[match.matchId]}
                              >
                                <Check className="mr-1 h-3 w-3" />
                                承認
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  マッピングが必要な試合はありません
                </p>
              )}
            </CardContent>
          </Card>

          {/* 承認済みマッピング */}
          <Card>
            <CardHeader>
              <CardTitle>承認済みマッピング</CardTitle>
              <CardDescription>
                perform_id が承認されている試合の一覧（最新200件）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingApproved ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : approvedData && approvedData.mappings.length > 0 ? (
                <div className="space-y-2">
                  {approvedData.mappings.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {getVenueBadge(match.marinosSide ?? undefined)}
                          <span className="font-medium text-sm">vs {match.opponent}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(match.date, 'short')}
                          </span>
                        </div>
                        <code className="text-xs font-mono text-muted-foreground">
                          {match.performId}
                        </code>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(match.matchId)}
                        disabled={deleteMappingMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  承認済みのマッピングはありません
                </p>
              )}
            </CardContent>
          </Card>

          {/* 使い方ガイド */}
          <Card>
            <CardHeader>
              <CardTitle>使い方</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                1. <strong>perform_id</strong> は J.LEAGUE チケットシステムで使用される試合の一意識別子です
              </p>
              <p>
                2. 各試合に perform_id を入力し、<strong>「候補として保存」</strong>または<strong>「承認」</strong>をクリックします
              </p>
              <p>
                3. 候補として保存した perform_id は後で承認または削除できます
              </p>
              <p>
                4. 承認済みの perform_id は将来的にチケット情報の自動取得に使用される予定です
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
