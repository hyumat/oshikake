import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  opponent: string;
  marinosSide: 'all' | 'home' | 'away';
  watchedOnly: boolean;
}

interface MatchFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
}

type QuickFilter = 'all' | 'watched' | 'watched-home' | 'watched-away';

export function MatchFilter({ filters, onFiltersChange, onReset }: MatchFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getActiveQuickFilter = (): QuickFilter => {
    if (!filters.watchedOnly) return 'all';
    if (filters.marinosSide === 'home') return 'watched-home';
    if (filters.marinosSide === 'away') return 'watched-away';
    return 'watched';
  };

  const handleQuickFilter = (filter: QuickFilter) => {
    switch (filter) {
      case 'all':
        onFiltersChange({ ...filters, watchedOnly: false, marinosSide: 'all' });
        break;
      case 'watched':
        onFiltersChange({ ...filters, watchedOnly: true, marinosSide: 'all' });
        break;
      case 'watched-home':
        onFiltersChange({ ...filters, watchedOnly: true, marinosSide: 'home' });
        break;
      case 'watched-away':
        onFiltersChange({ ...filters, watchedOnly: true, marinosSide: 'away' });
        break;
    }
  };

  const handleDateFromChange = (value: string) => {
    onFiltersChange({ ...filters, dateFrom: value });
  };

  const handleDateToChange = (value: string) => {
    onFiltersChange({ ...filters, dateTo: value });
  };

  const handleOpponentChange = (value: string) => {
    onFiltersChange({ ...filters, opponent: value });
  };

  const hasDetailFilters = filters.dateFrom || filters.dateTo || filters.opponent;
  const activeQuickFilter = getActiveQuickFilter();

  const quickFilterButtons: { key: QuickFilter; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'watched', label: '観戦した試合' },
    { key: 'watched-home', label: '観戦したホーム' },
    { key: 'watched-away', label: '観戦したアウェイ' },
  ];

  return (
    <Card className="mb-4">
      <div className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {quickFilterButtons.map(({ key, label }) => (
            <Button
              key={key}
              variant={activeQuickFilter === key ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleQuickFilter(key)}
            >
              {label}
            </Button>
          ))}
          
          <div className="flex-1" />
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            詳細検索
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {hasDetailFilters && (
            <Button
              onClick={onReset}
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">開始日</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">終了日</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">対戦相手</label>
                <Input
                  type="text"
                  value={filters.opponent}
                  onChange={(e) => handleOpponentChange(e.target.value)}
                  placeholder="チーム名..."
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
