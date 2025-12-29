import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, MapPin, Clock, Trophy, Save, Wallet, Train, Ticket, Utensils, MoreHorizontal } from 'lucide-react';

type ExpenseData = {
  transportation: string;
  ticket: string;
  food: string;
  other: string;
  note: string;
};

const STORAGE_KEY = 'oshikake-expenses';

function loadExpenses(): Record<string, ExpenseData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveExpenses(expenses: Record<string, ExpenseData>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export default function MatchDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const matchId = params.id || '';

  const [expenses, setExpenses] = useState<ExpenseData>({
    transportation: '',
    ticket: '',
    food: '',
    other: '',
    note: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading, error } = trpc.matches.listOfficial.useQuery({});

  const match = data?.matches?.find((m: { id: number | string }) => String(m.id) === matchId);

  useEffect(() => {
    if (matchId) {
      const stored = loadExpenses();
      if (stored[matchId]) {
        setExpenses(stored[matchId]);
      }
    }
  }, [matchId]);

  const handleSave = () => {
    setIsSaving(true);
    try {
      const stored = loadExpenses();
      stored[matchId] = expenses;
      saveExpenses(stored);
      toast.success('保存しました');
    } catch {
      toast.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const totalCost = [
    expenses.transportation,
    expenses.ticket,
    expenses.food,
    expenses.other,
  ].reduce((sum, val) => sum + (parseInt(val, 10) || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error || !match) {
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

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const marinosGoals = match.marinosSide === 'home' ? match.homeScore : match.awayScore;
  const opponentGoals = match.marinosSide === 'home' ? match.awayScore : match.homeScore;
  const hasScore = marinosGoals !== undefined && opponentGoals !== undefined && match.isResult;

  const getResultInfo = () => {
    if (!hasScore) return null;
    const mg = marinosGoals!;
    const og = opponentGoals!;
    if (mg > og) return { label: '勝', color: 'bg-green-100 text-green-800 border-green-300' };
    if (mg < og) return { label: '負', color: 'bg-red-100 text-red-800 border-red-300' };
    return { label: '分', color: 'bg-gray-100 text-gray-800 border-gray-300' };
  };

  const resultInfo = getResultInfo();
  const isPastMatch = new Date(match.date) < new Date();
  const venueLabel = match.marinosSide === 'home' ? 'HOME' : 'AWAY';
  const venueColor = match.marinosSide === 'home' 
    ? 'bg-blue-600 text-white' 
    : 'bg-red-600 text-white';

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => setLocation('/matches')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          マッチログに戻る
        </Button>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${venueColor}`}>
                {venueLabel}
              </span>
              {match.competition && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded dark:bg-slate-800 dark:text-slate-300">
                  {match.competition}
                </span>
              )}
            </div>
            <CardTitle className="text-2xl">
              vs {match.opponent}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDate(match.date)}</span>
              </div>
              {match.kickoff && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{match.kickoff}</span>
                </div>
              )}
              {match.stadium && (
                <div className="flex items-center gap-2 col-span-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.stadium)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {match.stadium}
                  </a>
                </div>
              )}
            </div>

            {hasScore && (
              <div className="flex items-center justify-center gap-4 py-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">マリノス</p>
                  <p className="text-4xl font-bold">{marinosGoals}</p>
                </div>
                <div className="text-2xl text-muted-foreground">-</div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{match.opponent}</p>
                  <p className="text-4xl font-bold">{opponentGoals}</p>
                </div>
                {resultInfo && (
                  <span className={`ml-4 px-3 py-1 text-lg font-bold rounded-full border ${resultInfo.color}`}>
                    {resultInfo.label}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5" />
              観戦費用
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transportation" className="flex items-center gap-2 text-sm">
                  <Train className="w-4 h-4" />
                  交通費
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                  <Input
                    id="transportation"
                    type="number"
                    min="0"
                    className="pl-8"
                    placeholder="0"
                    value={expenses.transportation}
                    onChange={(e) => setExpenses({ ...expenses, transportation: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket" className="flex items-center gap-2 text-sm">
                  <Ticket className="w-4 h-4" />
                  チケット代
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                  <Input
                    id="ticket"
                    type="number"
                    min="0"
                    className="pl-8"
                    placeholder="0"
                    value={expenses.ticket}
                    onChange={(e) => setExpenses({ ...expenses, ticket: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="food" className="flex items-center gap-2 text-sm">
                  <Utensils className="w-4 h-4" />
                  飲食代
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                  <Input
                    id="food"
                    type="number"
                    min="0"
                    className="pl-8"
                    placeholder="0"
                    value={expenses.food}
                    onChange={(e) => setExpenses({ ...expenses, food: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="other" className="flex items-center gap-2 text-sm">
                  <MoreHorizontal className="w-4 h-4" />
                  その他
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                  <Input
                    id="other"
                    type="number"
                    min="0"
                    className="pl-8"
                    placeholder="0"
                    value={expenses.other}
                    onChange={(e) => setExpenses({ ...expenses, other: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>合計</span>
                <span>¥{totalCost.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note" className="text-sm">メモ</Label>
              <Textarea
                id="note"
                placeholder="試合の感想やメモを入力..."
                rows={3}
                value={expenses.note}
                onChange={(e) => setExpenses({ ...expenses, note: e.target.value })}
              />
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              保存する
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
