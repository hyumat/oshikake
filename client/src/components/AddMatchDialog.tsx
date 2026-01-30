import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

interface AddMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddMatchDialog({ open, onOpenChange, onSuccess }: AddMatchDialogProps) {
  const [date, setDate] = useState("");
  const [kickoff, setKickoff] = useState("");
  const [opponent, setOpponent] = useState("");
  const [marinosSide, setMarinosSide] = useState<"home" | "away">("home");
  const [stadium, setStadium] = useState("");
  const [competition, setCompetition] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [notes, setNotes] = useState("");

  const createMatchMutation = trpc.matches.createManual.useMutation({
    onSuccess: () => {
      toast.success("試合を追加しました");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message || "試合の追加に失敗しました");
    },
  });

  const resetForm = () => {
    setDate("");
    setKickoff("");
    setOpponent("");
    setMarinosSide("home");
    setStadium("");
    setCompetition("");
    setHomeScore("");
    setAwayScore("");
    setNotes("");
  };

  const handleSubmit = () => {
    // Validation
    if (!date) {
      toast.error("試合日を入力してください");
      return;
    }
    if (!opponent) {
      toast.error("対戦相手を入力してください");
      return;
    }

    const hasScore = homeScore !== "" || awayScore !== "";
    const isResult = hasScore ? 1 : 0;

    createMatchMutation.mutate({
      date,
      kickoff: kickoff || undefined,
      opponent,
      marinosSide,
      stadium: stadium || undefined,
      competition: competition || "その他",
      homeScore: homeScore ? parseInt(homeScore, 10) : undefined,
      awayScore: awayScore ? parseInt(awayScore, 10) : undefined,
      isResult,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>試合を手動で追加</DialogTitle>
          <DialogDescription>
            公式データにない試合を手動で追加できます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 試合日 */}
          <div className="space-y-2">
            <Label htmlFor="date">試合日 *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* キックオフ */}
          <div className="space-y-2">
            <Label htmlFor="kickoff">キックオフ時刻</Label>
            <Input
              id="kickoff"
              type="time"
              value={kickoff}
              onChange={(e) => setKickoff(e.target.value)}
              placeholder="例: 19:00"
            />
          </div>

          {/* 対戦相手 */}
          <div className="space-y-2">
            <Label htmlFor="opponent">対戦相手 *</Label>
            <Input
              id="opponent"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="例: 川崎フロンターレ"
            />
          </div>

          {/* ホーム/アウェイ */}
          <div className="space-y-2">
            <Label htmlFor="marinosSide">ホーム/アウェイ</Label>
            <Select value={marinosSide} onValueChange={(val) => setMarinosSide(val as "home" | "away")}>
              <SelectTrigger id="marinosSide">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="home">ホーム</SelectItem>
                <SelectItem value="away">アウェイ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* スタジアム */}
          <div className="space-y-2">
            <Label htmlFor="stadium">スタジアム</Label>
            <Input
              id="stadium"
              value={stadium}
              onChange={(e) => setStadium(e.target.value)}
              placeholder="例: 日産スタジアム"
            />
          </div>

          {/* 大会名 */}
          <div className="space-y-2">
            <Label htmlFor="competition">大会名</Label>
            <Select value={competition} onValueChange={setCompetition}>
              <SelectTrigger id="competition">
                <SelectValue placeholder="大会を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="J1リーグ">J1リーグ</SelectItem>
                <SelectItem value="ルヴァンカップ">ルヴァンカップ</SelectItem>
                <SelectItem value="天皇杯">天皇杯</SelectItem>
                <SelectItem value="ACL">ACL</SelectItem>
                <SelectItem value="プレシーズンマッチ">プレシーズンマッチ</SelectItem>
                <SelectItem value="その他">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* スコア（オプション） */}
          <div className="space-y-2">
            <Label>試合結果（任意）</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="ホーム"
                className="w-20"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                placeholder="アウェイ"
                className="w-20"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              試合終了後にスコアを入力してください
            </p>
          </div>

          {/* 備考 */}
          <div className="space-y-2">
            <Label htmlFor="notes">備考</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="メモや特記事項"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={createMatchMutation.isPending}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMatchMutation.isPending}
          >
            {createMatchMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            追加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
