/**
 * Match Detail Page
 * Issue #161: Redesigned with 3-tier layout (header/tabs/content) and category-based navigation
 * Issue #39: Refactored to use MatchDetailView and UserMatchForm components
 * Issue #19: Expenses now saved to DB instead of LocalStorage
 * Issue #44: Free plan limit (10 records per season)
 */

import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Wallet, Car, Hotel, UtensilsCrossed, StickyNote, Camera, PackageCheck, Plus, Save, Trash2 } from 'lucide-react';
import { MatchDetailView } from '@/components/MatchDetailView';
import { QueryLoading, QueryError } from '@/components/QueryState';
import { LimitReachedModal } from '@/components/LimitReachedModal';
import { PlanStatusBadge } from '@/components/PlanStatusBadge';
import type { MatchDTO } from '@shared/dto';
import { FREE_PLAN_LIMIT } from '@shared/billing';

type CategoryType = 'wallet' | 'transport' | 'accommodation' | 'food' | 'note' | 'photo' | 'packing';

interface ExpenseData {
  transportation: string;
  ticket: string;
  food: string;
  other: string;
  note: string;
}

export default function MatchDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const matchId = params.id || '';
  const matchIdNum = parseInt(matchId, 10);

  const [activeCategory, setActiveCategory] = useState<CategoryType>('wallet');
  const [initialExpenses, setInitialExpenses] = useState<ExpenseData>({
    transportation: '',
    ticket: '',
    food: '',
    other: '',
    note: '',
  });
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Local state for form inputs
  const [formData, setFormData] = useState<ExpenseData>({
    transportation: '',
    ticket: '',
    food: '',
    other: '',
    note: '',
  });

  const { data, isLoading, error, refetch } = trpc.matches.listOfficial.useQuery({});
  
  const { data: planStatus } = trpc.userMatches.getPlanStatus.useQuery();
  const match = data?.matches?.find((m: { id: number | string }) => String(m.id) === matchId) as MatchDTO | undefined;

  const { data: attendanceData, isLoading: isLoadingAttendance, refetch: refetchAttendance } = 
    trpc.userMatches.getByMatchId.useQuery(
      { matchId: matchIdNum },
      { enabled: !isNaN(matchIdNum) }
    );

  const saveAttendanceMutation = trpc.userMatches.saveAttendance.useMutation({
    onSuccess: () => {
      toast.success('保存しました');
      refetchAttendance();
    },
    onError: (err) => {
      if (err.message === 'LIMIT_REACHED') {
        setShowLimitModal(true);
      } else {
        toast.error(err.message || '保存に失敗しました');
      }
    },
  });

  const deleteAttendanceMutation = trpc.userMatches.deleteByMatchId.useMutation({
    onSuccess: () => {
      toast.success('削除しました');
      setInitialExpenses({
        transportation: '',
        ticket: '',
        food: '',
        other: '',
        note: '',
      });
      refetchAttendance();
    },
    onError: (err) => {
      toast.error(err.message || '削除に失敗しました');
    },
  });

  useEffect(() => {
    if (attendanceData?.expenses && attendanceData.expenses.length > 0) {
      const expenseMap: Record<string, number> = {};
      for (const exp of attendanceData.expenses) {
        expenseMap[exp.category] = exp.amount;
      }
      const newData = {
        transportation: expenseMap.transport?.toString() || '',
        ticket: expenseMap.ticket?.toString() || '',
        food: expenseMap.food?.toString() || '',
        other: expenseMap.other?.toString() || '',
        note: attendanceData.userMatch?.note || '',
      };
      setInitialExpenses(newData);
      setFormData(newData);
    } else if (attendanceData?.userMatch) {
      const newData = {
        transportation: '',
        ticket: '',
        food: '',
        other: '',
        note: attendanceData.userMatch.note || '',
      };
      setInitialExpenses(newData);
      setFormData(newData);
    }
  }, [attendanceData]);

  const handleSubmit = () => {
    if (!match) return;

    const transport = parseInt(formData.transportation, 10) || 0;
    const ticket = parseInt(formData.ticket, 10) || 0;
    const food = parseInt(formData.food, 10) || 0;
    const other = parseInt(formData.other, 10) || 0;

    saveAttendanceMutation.mutate({
      matchId: matchIdNum,
      date: match.date,
      opponent: match.opponent,
      kickoff: match.kickoff ?? undefined,
      competition: match.competition ?? undefined,
      stadium: match.stadium ?? undefined,
      marinosSide: match.marinosSide as 'home' | 'away' | undefined,
      note: formData.note || undefined,
      expenses: {
        transport,
        ticket,
        food,
        other,
      },
    });
  };

  const handleDelete = () => {
    deleteAttendanceMutation.mutate({ matchId: matchIdNum });
  };

  const categoryConfig = [
    { id: 'wallet' as const, label: 'チケット', icon: Wallet },
    { id: 'transport' as const, label: '交通', icon: Car },
    { id: 'accommodation' as const, label: '宿泊', icon: Hotel },
    { id: 'food' as const, label: '飲食', icon: UtensilsCrossed },
    { id: 'note' as const, label: 'メモ', icon: StickyNote },
    { id: 'photo' as const, label: '写真', icon: Camera },
    { id: 'packing' as const, label: '持ち物', icon: PackageCheck },
  ];

  const BackButton = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocation('/matches')}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      マッチログに戻る
    </Button>
  );

  if (isLoading || isLoadingAttendance) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <BackButton />
          <QueryLoading message="読み込み中..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <BackButton />
          <QueryError 
            message="試合情報の取得に失敗しました" 
            onRetry={() => refetch()} 
          />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">試合が見つかりません</p>
        <Button onClick={() => setLocation('/matches')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          マッチログに戻る
        </Button>
      </div>
    );
  }

  const hasExpenses = initialExpenses.transportation || initialExpenses.ticket ||
                       initialExpenses.food || initialExpenses.other || initialExpenses.note;

  const isSaving = saveAttendanceMutation.isPending || deleteAttendanceMutation.isPending;

  const isExistingAttendance = !!attendanceData?.userMatch?.status && attendanceData.userMatch.status === 'attended';

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'wallet':
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ticket">チケット代（円）</Label>
                  <Input
                    id="ticket"
                    type="number"
                    placeholder="例: 3000"
                    value={formData.ticket}
                    onChange={(e) => setFormData({ ...formData, ticket: e.target.value })}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  ※URL・画像アップロード機能は今後実装予定です
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'transport':
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="transportation">交通費（円）</Label>
                <Input
                  id="transportation"
                  type="number"
                  placeholder="例: 2000"
                  value={formData.transportation}
                  onChange={(e) => setFormData({ ...formData, transportation: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 'accommodation':
        return (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                宿泊機能は今後実装予定です
              </p>
            </CardContent>
          </Card>
        );

      case 'food':
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="food">飲食代（円）</Label>
                  <Input
                    id="food"
                    type="number"
                    placeholder="例: 1500"
                    value={formData.food}
                    onChange={(e) => setFormData({ ...formData, food: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other">その他（円）</Label>
                  <Input
                    id="other"
                    type="number"
                    placeholder="例: 500"
                    value={formData.other}
                    onChange={(e) => setFormData({ ...formData, other: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'note':
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="note">メモ</Label>
                <Textarea
                  id="note"
                  placeholder="試合の感想やメモを入力..."
                  rows={6}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 'photo':
        return (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                写真機能は今後実装予定です
              </p>
            </CardContent>
          </Card>
        );

      case 'packing':
        return (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                持ち物リスト機能は今後実装予定です
              </p>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <BackButton />
          {planStatus && !isExistingAttendance && (
            <PlanStatusBadge
              effectivePlan={planStatus.effectivePlan}
              attendanceCount={planStatus.attendanceCount}
              limit={planStatus.limit}
              remaining={planStatus.remaining}
            />
          )}
        </div>

        {/* Top: Match Header */}
        <MatchDetailView match={match} />

        {/* Middle: Category Tabs */}
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as CategoryType)} className="mb-6">
          <TabsList className="w-full grid grid-cols-4 lg:grid-cols-7">
            {categoryConfig.map((cat) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger key={cat.id} value={cat.id} className="flex flex-col gap-1 py-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{cat.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Bottom: Category Content */}
        <div className="mb-6">
          {renderCategoryContent()}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            保存
          </Button>
          {hasExpenses && (
            <Button
              onClick={handleDelete}
              disabled={isSaving}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              削除
            </Button>
          )}
        </div>
      </div>

      <LimitReachedModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        seasonYear={planStatus?.seasonYear ?? new Date().getFullYear()}
        limit={FREE_PLAN_LIMIT}
      />
    </div>
  );
}
