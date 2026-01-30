/**
 * Issue #81: 遠征プラン入力フォーム
 *
 * 試合詳細ページのトレンドセクション下部に表示する、
 * 宿泊・交通手段・予算帯の3項目入力フォーム。
 * upsert パターンで保存し、保存後にトレンドを即時反映する。
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin } from 'lucide-react';

/** 宿泊形態の選択肢（DBの lodgingType enum に対応） */
const LODGING_OPTIONS = [
  { value: 'day_trip', label: '日帰り' },
  { value: 'hotel', label: 'ホテル・旅館' },
  { value: 'friend', label: '友人宅' },
  { value: 'night_bus', label: '夜行バス' },
  { value: 'other', label: 'その他' },
] as const;

/** 交通手段の選択肢（DBの transportType enum に対応） */
const TRANSPORT_OPTIONS = [
  { value: 'shinkansen', label: '新幹線' },
  { value: 'airplane', label: '飛行機' },
  { value: 'car', label: '車' },
  { value: 'bus', label: 'バス' },
  { value: 'local_train', label: '在来線' },
  { value: 'other', label: 'その他' },
] as const;

/** 予算帯の選択肢（DBの budgetRange enum に対応） */
const BUDGET_OPTIONS = [
  { value: 'under_5k', label: '〜¥5,000' },
  { value: '5k_10k', label: '¥5,000〜¥10,000' },
  { value: '10k_20k', label: '¥10,000〜¥20,000' },
  { value: '20k_30k', label: '¥20,000〜¥30,000' },
  { value: '30k_50k', label: '¥30,000〜¥50,000' },
  { value: 'over_50k', label: '¥50,000〜' },
] as const;

type LodgingType = (typeof LODGING_OPTIONS)[number]['value'];
type TransportType = (typeof TRANSPORT_OPTIONS)[number]['value'];
type BudgetRange = (typeof BUDGET_OPTIONS)[number]['value'];

interface TravelPlanFormProps {
  matchId: number;
}

export function TravelPlanForm({ matchId }: TravelPlanFormProps) {
  const utils = trpc.useUtils();

  // 既存の意向を取得
  const { data: mineData } = trpc.travelIntents.mine.useQuery(
    { matchId },
    { enabled: !isNaN(matchId) },
  );

  const [lodging, setLodging] = useState<LodgingType | ''>('');
  const [transport, setTransport] = useState<TransportType | ''>('');
  const [budget, setBudget] = useState<BudgetRange | ''>('');

  // 既存データがあればフォームに反映
  useEffect(() => {
    if (mineData?.intent) {
      setLodging(mineData.intent.lodging as LodgingType);
      setTransport(mineData.intent.transport as TransportType);
      setBudget(mineData.intent.budget as BudgetRange);
    }
  }, [mineData]);

  const upsertMutation = trpc.travelIntents.upsert.useMutation({
    onSuccess: (data) => {
      const msg = data.action === 'created' ? '遠征プランを登録しました' : '遠征プランを更新しました';
      toast.success(msg);
      // トレンドを即時再取得
      utils.travelIntents.trends.invalidate({ matchId });
      utils.travelIntents.mine.invalidate({ matchId });
    },
    onError: (err) => {
      toast.error(err.message || '保存に失敗しました');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lodging || !transport || !budget) {
      toast.error('すべての項目を選択してください');
      return;
    }
    upsertMutation.mutate({
      matchId,
      lodging,
      transport,
      budget,
    });
  };

  const isComplete = lodging && transport && budget;
  const hasExisting = !!mineData?.intent;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          遠征プラン
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          あなたの遠征予定を共有して、みんなの傾向を見てみましょう
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 宿泊形態 */}
          <div className="space-y-1.5">
            <Label htmlFor="lodging">宿泊</Label>
            <Select
              value={lodging}
              onValueChange={(v) => setLodging(v as LodgingType)}
            >
              <SelectTrigger id="lodging" className="w-full">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {LODGING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 交通手段 */}
          <div className="space-y-1.5">
            <Label htmlFor="transport">交通手段</Label>
            <Select
              value={transport}
              onValueChange={(v) => setTransport(v as TransportType)}
            >
              <SelectTrigger id="transport" className="w-full">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {TRANSPORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 予算帯 */}
          <div className="space-y-1.5">
            <Label htmlFor="budget">予算帯</Label>
            <Select
              value={budget}
              onValueChange={(v) => setBudget(v as BudgetRange)}
            >
              <SelectTrigger id="budget" className="w-full">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isComplete || upsertMutation.isPending}
          >
            {upsertMutation.isPending
              ? '保存中...'
              : hasExisting
                ? '遠征プランを更新'
                : '遠征プランを登録'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
