/**
 * Issue #203: 遠征プランカード
 *
 * 試合詳細ページに表示する遠征プラン（交通・宿泊・立ち寄りスポット）の
 * 表示・追加・削除を行うカードコンポーネント。
 * planned ステータスの試合でのみ表示する。
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Luggage,
  Train,
  Hotel,
  MapPinned,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── ラベル定義 ────────────────────────────────────────────────

const TRANSPORT_METHODS: Record<string, string> = {
  shinkansen: '新幹線',
  airplane: '飛行機',
  car: '車',
  bus: 'バス',
  local_train: '在来線',
  ferry: 'フェリー',
  other: 'その他',
};

const DIRECTIONS: Record<string, string> = {
  outbound: '往路',
  return: '復路',
};

const SPOT_TAGS: Record<string, string> = {
  tourism: '観光',
  dining: 'グルメ',
  onsen: '温泉',
  landmark: '名所',
  merchandise: 'グッズ',
  other: 'その他',
};

const SPOT_PRIORITIES: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

// ─── サブコンポーネント: 交通追加フォーム ────────────────────────

function AddTransportForm({
  matchId,
  onDone,
}: {
  matchId: number;
  onDone: () => void;
}) {
  const [direction, setDirection] = useState<string>('outbound');
  const [method, setMethod] = useState<string>('shinkansen');
  const [note, setNote] = useState('');

  const mutation = trpc.tripPlans.addTransport.useMutation({
    onSuccess: () => { toast.success('交通プランを追加しました'); onDone(); },
    onError: (e) => toast.error(e.message || '追加に失敗しました'),
  });

  return (
    <div className="space-y-2 border rounded-lg p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">方向</Label>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(DIRECTIONS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">手段</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TRANSPORT_METHODS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Input
        placeholder="メモ（任意）"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() =>
            mutation.mutate({
              matchId,
              direction: direction as 'outbound' | 'return',
              method: method as any,
              note: note || undefined,
            })
          }
          disabled={mutation.isPending}
        >
          追加
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}

// ─── サブコンポーネント: 宿泊追加フォーム ────────────────────────

function AddLodgingForm({
  matchId,
  onDone,
}: {
  matchId: number;
  onDone: () => void;
}) {
  const [stayOvernight, setStayOvernight] = useState(true);
  const [hotelName, setHotelName] = useState('');
  const [note, setNote] = useState('');

  const mutation = trpc.tripPlans.addLodging.useMutation({
    onSuccess: () => { toast.success('宿泊プランを追加しました'); onDone(); },
    onError: (e) => toast.error(e.message || '追加に失敗しました'),
  });

  return (
    <div className="space-y-2 border rounded-lg p-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs">宿泊</Label>
        <Select value={stayOvernight ? 'yes' : 'no'} onValueChange={(v) => setStayOvernight(v === 'yes')}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">あり</SelectItem>
            <SelectItem value="no">なし</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {stayOvernight && (
        <Input
          placeholder="ホテル名（任意）"
          value={hotelName}
          onChange={(e) => setHotelName(e.target.value)}
        />
      )}
      <Input
        placeholder="メモ（任意）"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() =>
            mutation.mutate({
              matchId,
              stayOvernight,
              hotelName: hotelName || undefined,
              note: note || undefined,
            })
          }
          disabled={mutation.isPending}
        >
          追加
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}

// ─── サブコンポーネント: スポット追加フォーム ──────────────────

function AddSpotForm({
  matchId,
  onDone,
}: {
  matchId: number;
  onDone: () => void;
}) {
  const [spotName, setSpotName] = useState('');
  const [tag, setTag] = useState<string>('dining');
  const [note, setNote] = useState('');

  const mutation = trpc.tripPlans.addSpot.useMutation({
    onSuccess: () => { toast.success('スポットを追加しました'); onDone(); },
    onError: (e) => toast.error(e.message || '追加に失敗しました'),
  });

  return (
    <div className="space-y-2 border rounded-lg p-3">
      <Input
        placeholder="スポット名"
        value={spotName}
        onChange={(e) => setSpotName(e.target.value)}
      />
      <div>
        <Label className="text-xs">タグ</Label>
        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(SPOT_TAGS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        placeholder="メモ（任意）"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            if (!spotName.trim()) { toast.error('スポット名を入力してください'); return; }
            mutation.mutate({
              matchId,
              spotName: spotName.trim(),
              tag: tag as any,
              note: note || undefined,
            });
          }}
          disabled={mutation.isPending || !spotName.trim()}
        >
          追加
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ──────────────────────────────────────

interface TripPlanCardProps {
  matchId: number;
}

export function TripPlanCard({ matchId }: TripPlanCardProps) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.tripPlans.getAll.useQuery(
    { matchId },
    { enabled: !isNaN(matchId) },
  );

  const [expanded, setExpanded] = useState(true);
  const [showAddTransport, setShowAddTransport] = useState(false);
  const [showAddLodging, setShowAddLodging] = useState(false);
  const [showAddSpot, setShowAddSpot] = useState(false);

  const invalidate = () => utils.tripPlans.getAll.invalidate({ matchId });

  const deleteTransport = trpc.tripPlans.deleteTransport.useMutation({
    onSuccess: () => { toast.success('削除しました'); invalidate(); },
    onError: (e) => toast.error(e.message || '削除に失敗しました'),
  });
  const deleteLodging = trpc.tripPlans.deleteLodging.useMutation({
    onSuccess: () => { toast.success('削除しました'); invalidate(); },
    onError: (e) => toast.error(e.message || '削除に失敗しました'),
  });
  const deleteSpot = trpc.tripPlans.deleteSpot.useMutation({
    onSuccess: () => { toast.success('削除しました'); invalidate(); },
    onError: (e) => toast.error(e.message || '削除に失敗しました'),
  });

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const transports = data?.transports ?? [];
  const lodgings = data?.lodgings ?? [];
  const spots = data?.spots ?? [];
  const totalItems = transports.length + lodgings.length + spots.length;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="text-base flex items-center gap-2">
            <Luggage className="w-4 h-4" />
            遠征プラン
            {totalItems > 0 && (
              <Badge variant="secondary" className="text-xs">{totalItems}</Badge>
            )}
          </CardTitle>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <p className="text-xs text-muted-foreground">
          交通・宿泊・立ち寄りスポットの事前メモ
        </p>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* ── 交通 ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Train className="w-3.5 h-3.5" /> 交通
              </h4>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => setShowAddTransport(true)}
              >
                <Plus className="w-3 h-3 mr-1" /> 追加
              </Button>
            </div>
            {transports.map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded-md px-3 py-2 mb-1.5 text-sm">
                <div>
                  <span className="font-medium">{DIRECTIONS[t.direction] ?? t.direction}</span>
                  <span className="text-muted-foreground ml-2">{TRANSPORT_METHODS[t.method] ?? t.method}</span>
                  {t.note && <p className="text-xs text-muted-foreground mt-0.5">{t.note}</p>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => deleteTransport.mutate({ id: t.id })}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            {transports.length === 0 && !showAddTransport && (
              <p className="text-xs text-muted-foreground">未設定</p>
            )}
            {showAddTransport && (
              <AddTransportForm
                matchId={matchId}
                onDone={() => { setShowAddTransport(false); invalidate(); }}
              />
            )}
          </div>

          {/* ── 宿泊 ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Hotel className="w-3.5 h-3.5" /> 宿泊
              </h4>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => setShowAddLodging(true)}
              >
                <Plus className="w-3 h-3 mr-1" /> 追加
              </Button>
            </div>
            {lodgings.map((l) => (
              <div key={l.id} className="flex items-center justify-between border rounded-md px-3 py-2 mb-1.5 text-sm">
                <div>
                  <span className="font-medium">{l.stayOvernight ? '宿泊あり' : '日帰り'}</span>
                  {l.hotelName && <span className="text-muted-foreground ml-2">{l.hotelName}</span>}
                  {l.budgetYen != null && l.budgetYen > 0 && (
                    <span className="text-muted-foreground ml-2">¥{l.budgetYen.toLocaleString()}</span>
                  )}
                  {l.note && <p className="text-xs text-muted-foreground mt-0.5">{l.note}</p>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => deleteLodging.mutate({ id: l.id })}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            {lodgings.length === 0 && !showAddLodging && (
              <p className="text-xs text-muted-foreground">未設定</p>
            )}
            {showAddLodging && (
              <AddLodgingForm
                matchId={matchId}
                onDone={() => { setShowAddLodging(false); invalidate(); }}
              />
            )}
          </div>

          {/* ── スポット ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MapPinned className="w-3.5 h-3.5" /> 立ち寄りスポット
              </h4>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => setShowAddSpot(true)}
              >
                <Plus className="w-3 h-3 mr-1" /> 追加
              </Button>
            </div>
            {spots.map((s) => (
              <div key={s.id} className="flex items-center justify-between border rounded-md px-3 py-2 mb-1.5 text-sm">
                <div>
                  <span className="font-medium">{s.spotName}</span>
                  {s.tag && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {SPOT_TAGS[s.tag] ?? s.tag}
                    </Badge>
                  )}
                  {s.priority && s.priority !== 'medium' && (
                    <span className="text-xs text-muted-foreground ml-2">
                      優先度: {SPOT_PRIORITIES[s.priority] ?? s.priority}
                    </span>
                  )}
                  {s.note && <p className="text-xs text-muted-foreground mt-0.5">{s.note}</p>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => deleteSpot.mutate({ id: s.id })}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            {spots.length === 0 && !showAddSpot && (
              <p className="text-xs text-muted-foreground">未設定</p>
            )}
            {showAddSpot && (
              <AddSpotForm
                matchId={matchId}
                onDone={() => { setShowAddSpot(false); invalidate(); }}
              />
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
