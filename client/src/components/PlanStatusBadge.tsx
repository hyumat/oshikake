import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { Link } from "wouter";

interface PlanStatusBadgeProps {
  effectivePlan: 'free' | 'pro';
  attendanceCount: number;
  limit: number;
  remaining: number;
  showUpgradeLink?: boolean;
}

export function PlanStatusBadge({ 
  effectivePlan, 
  attendanceCount, 
  limit, 
  remaining,
  showUpgradeLink = true 
}: PlanStatusBadgeProps) {
  if (effectivePlan === 'pro') {
    return (
      <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
        <Crown className="w-3 h-3 mr-1" />
        Pro
      </Badge>
    );
  }

  const isNearLimit = remaining <= 3 && remaining > 0;
  const isAtLimit = remaining === 0;

  const content = (
    <Badge 
      variant={isAtLimit ? "destructive" : isNearLimit ? "outline" : "secondary"}
      className={isNearLimit ? "border-amber-500 text-amber-600" : ""}
    >
      {attendanceCount}/{limit} 件
    </Badge>
  );

  if (showUpgradeLink && (isAtLimit || isNearLimit)) {
    return (
      <Link href="/upgrade" className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
