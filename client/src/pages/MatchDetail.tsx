/**
 * Match Detail Page
 * Issue #39: Refactored to use MatchDetailView and UserMatchForm components
 * Issue #19: Expenses now saved to DB instead of LocalStorage
 * Issue #44: Free plan limit (10 records per season)
 */

import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { MatchDetailView } from '@/components/MatchDetailView';
import { UserMatchForm, type ExpenseData } from '@/components/UserMatchForm';
import { QueryLoading, QueryError } from '@/components/QueryState';
import { LimitReachedModal } from '@/components/LimitReachedModal';
import { PlanStatusBadge } from '@/components/PlanStatusBadge';
import { TravelTrends } from '@/components/TravelTrends';
import { TravelPlanForm } from '@/components/TravelPlanForm';
import type { MatchDTO } from '@shared/dto';
import { FREE_PLAN_LIMIT } from '@shared/billing';
import { useAuth } from '@/_core/hooks/useAuth';

export default function MatchDetail() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const params = useParams();
  const matchId = params.id || '';
  const matchIdNum = parseInt(matchId, 10);

  const [initialExpenses, setInitialExpenses] = useState<ExpenseData>({
    transportation: '',
    ticket: '',
    food: '',
    other: '',
    note: '',
  });
  const [showLimitModal, setShowLimitModal] = useState(false);

  const { data, isLoading, error, refetch } = trpc.matches.listOfficial.useQuery({
    teamId: user?.supportedTeamId ?? undefined,
  });
  
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
      setInitialExpenses({
        transportation: expenseMap.transport?.toString() || '',
        ticket: expenseMap.ticket?.toString() || '',
        food: expenseMap.food?.toString() || '',
        other: expenseMap.other?.toString() || '',
        note: attendanceData.userMatch?.note || '',
      });
    } else if (attendanceData?.userMatch) {
      setInitialExpenses({
        transportation: '',
        ticket: '',
        food: '',
        other: '',
        note: attendanceData.userMatch.note || '',
      });
    }
  }, [attendanceData]);

  const handleSubmit = (expenses: ExpenseData) => {
    if (!match) return;

    const transport = parseInt(expenses.transportation, 10) || 0;
    const ticket = parseInt(expenses.ticket, 10) || 0;
    const food = parseInt(expenses.food, 10) || 0;
    const other = parseInt(expenses.other, 10) || 0;

    saveAttendanceMutation.mutate({
      matchId: matchIdNum,
      date: match.date,
      opponent: match.opponent,
      kickoff: match.kickoff ?? undefined,
      competition: match.competition ?? undefined,
      stadium: match.stadium ?? undefined,
      marinosSide: match.marinosSide as 'home' | 'away' | undefined,
      note: expenses.note || undefined,
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

  return (
    <div className="min-h-screen bg-background">
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
        <MatchDetailView match={match} />
        <UserMatchForm
          initialValues={initialExpenses}
          onSubmit={handleSubmit}
          onDelete={hasExpenses ? handleDelete : undefined}
          isSaving={isSaving}
        />
        <TravelTrends matchId={matchIdNum} />
        <TravelPlanForm matchId={matchIdNum} />
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
