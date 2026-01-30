import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { Link } from "wouter";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  requiredPlan: 'plus' | 'pro';
  featureDescription?: string;
}

export function PaywallModal({ open, onOpenChange, feature, requiredPlan, featureDescription }: PaywallModalProps) {
  const planName = requiredPlan === 'plus' ? 'Plus' : 'Pro';
  const planPrice = requiredPlan === 'plus' ? '¥490/月' : '¥980/月';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            {requiredPlan === 'pro' ? (
              <Sparkles className="w-5 h-5 text-primary" />
            ) : (
              <Lock className="w-5 h-5 text-primary" />
            )}
            <DialogTitle>この機能は{planName}プラン限定です</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2">
            <span className="font-medium text-foreground">{feature}</span>を利用するには、
            {planName}プラン（{planPrice}〜）へのアップグレードが必要です。
            {featureDescription && (
              <span className="block mt-2 text-muted-foreground">{featureDescription}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 my-4">
          <h4 className="font-medium text-sm mb-2">{planName}プランでできること</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {requiredPlan === 'plus' ? (
              <>
                <li>・観戦記録の無制限登録</li>
                <li>・CSVエクスポート</li>
                <li>・過去の自分を振り返る</li>
                <li>・全期間の集計表示</li>
              </>
            ) : (
              <>
                <li>・複数シーズンをまとめて管理</li>
                <li>・高度な集計（内訳・推移グラフ）</li>
                <li>・他の人の傾向をAI分析</li>
                <li>・費用カテゴリの自由設定</li>
                <li>・優先サポート</li>
              </>
            )}
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            キャンセル
          </Button>
          <Link href={`/pricing?plan=${requiredPlan}`} className="w-full sm:w-auto">
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              {planName}プランを見る
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
