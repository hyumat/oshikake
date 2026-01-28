import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

type KpiCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  onClick,
  children,
}: KpiCardProps) {
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <Card
      className={cn(
        "transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">{value}</span>
              {trend && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    isPositiveTrend ? "text-green-600" : "text-red-600"
                  )}
                >
                  {isPositiveTrend ? "+" : ""}
                  {trend.value}%
                  {trend.label && (
                    <span className="text-muted-foreground ml-1">
                      {trend.label}
                    </span>
                  )}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
