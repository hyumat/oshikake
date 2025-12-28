import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { MatchFilter, type FilterState } from '@/components/MatchFilter';

interface Match {
  id: number;
  sourceKey: string;
  date: string;
  kickoff?: string;
  competition?: string;
  homeTeam: string;
  awayTeam: string;
  opponent: string;
  stadium?: string;
  marinosSide?: 'home' | 'away';
  homeScore?: number;
  awayScore?: number;
  isResult: number;
  matchUrl: string;
}

export default function Matches() {
  const [, setLocation] = useLocation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    opponent: '',
    marinosSide: 'all',
  });

  // tRPC クエリ・ミューテーション
  const { data: matchesData, isLoading: isLoadingMatches, refetch } = trpc.matches.listOfficial.useQuery({});
  const fetchOfficialMutation = trpc.matches.fetchOfficial.useMutation();

  useEffect(() => {
    if (matchesData?.matches) {
      setMatches(matchesData.matches);
      applyFilters(matchesData.matches, filters);
    }
  }, [matchesData]);

  useEffect(() => {
    applyFilters(matches, filters);
  }, [filters]);

  const applyFilters = (matchList: Match[], filterState: FilterState) => {
    let result = matchList;

    // Date range filter
    if (filterState.dateFrom) {
      result = result.filter((m) => m.date >= filterState.dateFrom);
    }
    if (filterState.dateTo) {
      result = result.filter((m) => m.date <= filterState.dateTo);
    }

    // Opponent filter
    if (filterState.opponent) {
      const searchTerm = filterState.opponent.toLowerCase();
      result = result.filter((m) =>
        m.opponent.toLowerCase().includes(searchTerm)
      );
    }

    // Home/Away filter
    if (filterState.marinosSide !== 'all') {
      result = result.filter((m) => m.marinosSide === filterState.marinosSide);
    }

    setFilteredMatches(result);
  };

  const handleResetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      opponent: '',
      marinosSide: 'all',
    });
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await fetchOfficialMutation.mutateAsync({ force: false });
      setLastSync(new Date());
      refetch();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSync = async () => {
    setIsLoading(true);
    try {
      await fetchOfficialMutation.mutateAsync({ force: true });
      setLastSync(new Date());
      refetch();
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatScore = (match: Match) => {
    if (match.homeScore !== null && match.awayScore !== null) {
      return `${match.homeScore}-${match.awayScore}`;
    }
    return '-';
  };

  const getVenueTag = (marinosSide?: string) => {
    if (marinosSide === 'home') return 'H';
    if (marinosSide === 'away') return 'A';
    return 'O';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">マッチログ</h1>
          <p className="text-muted-foreground">
            横浜F・マリノスの試合情報を管理します
          </p>
        </div>

        {/* フィルター */}
        <MatchFilter
          filters={filters}
          onFiltersChange={setFilters}
          onReset={handleResetFilters}
        />

        {/* コントロール */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {lastSync && (
              <span>
                最終同期: {lastSync.toLocaleTimeString('ja-JP')}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSync}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              同期
            </Button>
            <Button
              onClick={handleForceSync}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              強制同期
            </Button>
            <Button
              onClick={() => {}}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              追加
            </Button>
          </div>
        </div>

        {/* 試合リスト */}
        {isLoadingMatches ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : filteredMatches.length === 0 && matches.length > 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                フィルター条件に合致する試合がありません。
              </p>
            </CardContent>
          </Card>
        ) : matches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                試合情報がまだ読み込まれていません。同期ボタンをクリックしてください。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block px-2 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded">
                          {getVenueTag(match.marinosSide)}
                        </span>
                        {match.competition && (
                          <span className="text-xs text-muted-foreground">
                            {match.competition}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-foreground truncate">
                        横浜FM vs {match.opponent}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatDate(match.date)}
                        {match.kickoff && ` ${match.kickoff}`}
                        {match.stadium && ` / ${match.stadium}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xl font-bold text-foreground">
                          {formatScore(match)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {match.isResult ? '試合終了' : '予定'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/matches/${match.id}`)}
                      >
                        詳細
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 統計情報 */}
        {filteredMatches.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  表示中の試合数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredMatches.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  結果済み
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredMatches.filter(m => m.isResult).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  予定中
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredMatches.filter(m => !m.isResult).length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
