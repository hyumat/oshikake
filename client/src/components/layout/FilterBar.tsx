import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Filter, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type FilterChip = {
  id: string;
  label: string;
  value: string;
};

type FilterBarProps = {
  filters?: FilterChip[];
  onRemoveFilter?: (id: string) => void;
  onClearAll?: () => void;
  periodOptions?: { value: string; label: string }[];
  selectedPeriod?: string;
  onPeriodChange?: (value: string) => void;
  onExport?: () => void;
  showExport?: boolean;
  className?: string;
  children?: ReactNode;
};

export function FilterBar({
  filters = [],
  onRemoveFilter,
  onClearAll,
  periodOptions,
  selectedPeriod,
  onPeriodChange,
  onExport,
  showExport = false,
  className,
  children,
}: FilterBarProps) {
  const hasFilters = filters.length > 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg",
        className
      )}
    >
      {periodOptions && onPeriodChange && (
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[140px] h-9 bg-background">
            <SelectValue placeholder="期間" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {children}

      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {filters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
            >
              <span className="text-xs text-muted-foreground mr-1">
                {filter.label}:
              </span>
              {filter.value}
              {onRemoveFilter && (
                <button
                  onClick={() => onRemoveFilter(filter.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {onClearAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-7 text-xs"
            >
              クリア
            </Button>
          )}
        </div>
      )}

      {showExport && onExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="ml-auto h-9"
        >
          <Download className="h-4 w-4 mr-1" />
          エクスポート
        </Button>
      )}
    </div>
  );
}
