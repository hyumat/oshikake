import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Save } from 'lucide-react';

export default function MatchDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const matchId = params.id ? parseInt(params.id, 10) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: 'planned' as 'planned' | 'attended',
    resultWdl: '' as 'W' | 'D' | 'L' | '',
    marinosGoals: '',
    opponentGoals: '',
    costYen: '',
    note: '',
  });

  // Fetch user match data
  const { data: userMatchData, isLoading: isLoadingUserMatch } = trpc.userMatches.getById.useQuery(
    { id: matchId || 0 },
    { enabled: !!matchId && !!user }
  );

  // Fetch official match details
  const { data: matchDetailsData } = trpc.userMatches.getMatchDetails.useQuery(
    { matchId: userMatchData?.match?.matchId || 0 },
    { enabled: !!userMatchData?.match?.matchId }
  );

  // Update mutation
  const updateMutation = trpc.userMatches.update.useMutation({
    onSuccess: () => {
      toast.success('試合情報を更新しました');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || '更新に失敗しました');
    },
  });

  // Delete mutation
  const deleteMutation = trpc.userMatches.delete.useMutation({
    onSuccess: () => {
      toast.success('試合を削除しました');
      setLocation('/matches');
    },
    onError: (error) => {
      toast.error(error.message || '削除に失敗しました');
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">ログインしてください</p>
      </div>
    );
  }

  if (isLoadingUserMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (!userMatchData?.match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-gray-600">試合が見つかりません</p>
        <Button onClick={() => setLocation('/matches')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          マッチログに戻る
        </Button>
      </div>
    );
  }

  const match = userMatchData.match;
  const officialMatch = matchDetailsData?.match;

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: match.id,
        status: formData.status,
        resultWdl: formData.resultWdl || undefined,
        marinosGoals: formData.marinosGoals ? parseInt(formData.marinosGoals, 10) : undefined,
        opponentGoals: formData.opponentGoals ? parseInt(formData.opponentGoals, 10) : undefined,
        costYen: formData.costYen ? parseInt(formData.costYen, 10) : 0,
        note: formData.note || undefined,
      });
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('この試合を削除してもよろしいですか？')) {
      try {
        await deleteMutation.mutateAsync({ id: match.id });
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/matches')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold">試合詳細</h1>
        </div>

        {/* Match Info Card */}
        <Card className="mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Match Info */}
            <div>
              <h2 className="text-xl font-semibold mb-4">試合情報</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">日付</p>
                  <p className="font-medium">{match.date}</p>
                </div>
                <div>
                  <p className="text-gray-600">対戦相手</p>
                  <p className="font-medium">{match.opponent}</p>
                </div>
                <div>
                  <p className="text-gray-600">ホーム/アウェイ</p>
                  <p className="font-medium">{match.marinosSide === 'home' ? 'ホーム' : 'アウェイ'}</p>
                </div>
                {match.stadium && (
                  <div>
                    <p className="text-gray-600">スタジアム</p>
                    <p className="font-medium">{match.stadium}</p>
                  </div>
                )}
                {match.kickoff && (
                  <div>
                    <p className="text-gray-600">キックオフ時刻</p>
                    <p className="font-medium">{match.kickoff}</p>
                  </div>
                )}
                {match.competition && (
                  <div>
                    <p className="text-gray-600">大会</p>
                    <p className="font-medium">{match.competition}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Score Info (if result) */}
            {match.status === 'attended' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">結果</h2>
                <div className="space-y-3">
                  {match.marinosGoals !== null && match.opponentGoals !== null ? (
                    <div className="text-center py-4 bg-blue-50 rounded-lg">
                      <p className="text-3xl font-bold">
                        {match.marinosGoals} - {match.opponentGoals}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        {match.resultWdl === 'W' ? '勝利' : match.resultWdl === 'D' ? '引き分け' : '敗北'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">結果未入力</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Edit Form */}
        {isEditing ? (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">観戦記録を編集</h2>
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">ステータス</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as 'planned' | 'attended' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">予定中</SelectItem>
                    <SelectItem value="attended">観戦済み</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Result (if attended) */}
              {formData.status === 'attended' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Result WDL */}
                    <div>
                      <label className="block text-sm font-medium mb-2">結果</label>
                      <Select
                        value={formData.resultWdl}
                        onValueChange={(value) =>
                          setFormData({ ...formData, resultWdl: value as 'W' | 'D' | 'L' | '' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">未定</SelectItem>
                          <SelectItem value="W">勝利</SelectItem>
                          <SelectItem value="D">引き分け</SelectItem>
                          <SelectItem value="L">敗北</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Marinos Goals */}
                    <div>
                      <label className="block text-sm font-medium mb-2">マリノス得点</label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.marinosGoals}
                        onChange={(e) =>
                          setFormData({ ...formData, marinosGoals: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>

                    {/* Opponent Goals */}
                    <div>
                      <label className="block text-sm font-medium mb-2">相手得点</label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.opponentGoals}
                        onChange={(e) =>
                          setFormData({ ...formData, opponentGoals: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Cost */}
              <div>
                <label className="block text-sm font-medium mb-2">費用 (円)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.costYen}
                  onChange={(e) =>
                    setFormData({ ...formData, costYen: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium mb-2">メモ</label>
                <Textarea
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="試合の感想やメモを入力..."
                  rows={4}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">観戦記録</h2>
            <div className="space-y-3 text-sm mb-4">
              <div>
                <p className="text-gray-600">ステータス</p>
                <p className="font-medium">
                  {match.status === 'attended' ? '観戦済み' : '予定中'}
                </p>
              </div>
              {match.status === 'attended' && match.resultWdl && (
                <div>
                  <p className="text-gray-600">結果</p>
                  <p className="font-medium">
                    {match.resultWdl === 'W' ? '勝利' : match.resultWdl === 'D' ? '引き分け' : '敗北'}
                  </p>
                </div>
              )}
              {match.costYen > 0 && (
                <div>
                  <p className="text-gray-600">費用</p>
                  <p className="font-medium">¥{match.costYen.toLocaleString()}</p>
                </div>
              )}
              {match.note && (
                <div>
                  <p className="text-gray-600">メモ</p>
                  <p className="font-medium whitespace-pre-wrap">{match.note}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(true)} className="flex-1">
                編集
              </Button>
              <Button
                onClick={handleDelete}
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
