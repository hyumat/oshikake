import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  opponent: string;
  marinosSide: 'all' | 'home' | 'away';
}

interface MatchFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
}

export function MatchFilter({ filters, onFiltersChange, onReset }: MatchFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDateFromChange = (value: string) => {
    onFiltersChange({ ...filters, dateFrom: value });
  };

  const handleDateToChange = (value: string) => {
    onFiltersChange({ ...filters, dateTo: value });
  };

  const handleOpponentChange = (value: string) => {
    onFiltersChange({ ...filters, opponent: value });
  };

  const handleMarinosSideChange = (value: string) => {
    onFiltersChange({ ...filters, marinosSide: value as 'all' | 'home' | 'away' });
  };

  const hasActiveFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.opponent ||
    filters.marinosSide !== 'all';

  return (
    <Card className="mb-6">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 font-semibold text-foreground hover:text-accent transition-colors"
          >
            <span>フィルター</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-accent rounded-full">
                {[filters.dateFrom, filters.dateTo, filters.opponent, filters.marinosSide !== 'all']
                  .filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <Button
              onClick={onReset}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              リセット
            </Button>
          )}
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4 pt-4 border-t border-border">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">開始日</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">終了日</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>

            {/* Opponent */}
            <div>
              <label className="block text-sm font-medium mb-2">対戦相手</label>
              <Input
                type="text"
                value={filters.opponent}
                onChange={(e) => handleOpponentChange(e.target.value)}
                placeholder="チーム名で検索..."
              />
            </div>

            {/* Home/Away */}
            <div>
              <label className="block text-sm font-medium mb-2">ホーム/アウェイ</label>
              <Select value={filters.marinosSide} onValueChange={handleMarinosSideChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="home">ホーム</SelectItem>
                  <SelectItem value="away">アウェイ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
