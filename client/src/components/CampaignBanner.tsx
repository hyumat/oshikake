import { useState, useEffect } from "react";
import { Sparkles, X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCampaignStatus, type CampaignStatus } from "@shared/billing";

/**
 * Issue #185: キャンペーン期間中に表示するバナー
 * Phase 0: ローンチ後1-2ヶ月は全ユーザーにPro権限を無料で付与
 */
export function CampaignBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus | null>(null);

  useEffect(() => {
    // Check if user has dismissed the banner in this session
    const isDismissed = sessionStorage.getItem("campaignBannerDismissed") === "true";
    setDismissed(isDismissed);

    // Get campaign status
    const status = getCampaignStatus();
    setCampaignStatus(status);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("campaignBannerDismissed", "true");
  };

  // Don't render if campaign is not active or banner is dismissed
  if (!campaignStatus?.isActive || dismissed) {
    return null;
  }

  const daysText = campaignStatus.daysRemaining !== null
    ? campaignStatus.daysRemaining > 0
      ? `残り${campaignStatus.daysRemaining}日`
      : "本日まで"
    : "";

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                ローンチ記念キャンペーン実施中！
              </p>
              <p className="text-sm text-white/90">
                期間限定で全機能（Pro相当）を無料でお試しいただけます。{daysText && `（${daysText}）`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 shrink-0"
            onClick={handleDismiss}
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
