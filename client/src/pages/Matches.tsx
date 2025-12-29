import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, RefreshCw, MapPin, Calendar, Clock } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { MatchFilter, type FilterState } from '@/components/MatchFilter';
import { toast } from 'sonner';

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
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    opponent: '',
    marinosSide: 'all',
  });

  // tRPC クエリ・ミューテーション
  const { data: matchesData, isLoading: isLoadingMatches, refetch } = trpc.matches.listOfficial.useQuery({});
  const fetchOfficialMutation = trpc.matches.fetchOfficial.useMutation();

  // ページアクセス時はキャッシュデータを表示（スクレイピングは手動）
  useEffect(() => {
    if (!isLoadingMatches) {
      setIsLoading(false);
    }
  }, [isLoadingMatches]);
  
  // 手動で最新データを取得
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const result = await fetchOfficialMutation.mutateAsync({ force: true });
      await refetch();
      if (result.success) {
        toast.success(`試合情報を更新しました（${result.matches}件）`);
      } else {
        toast.error('試合情報の取得に失敗しました');
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error);
      toast.error('試合情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (matchesData?.matches) {
      // Sort: upcoming matches first (by date asc), then finished (by date desc)
      const sorted = [...matchesData.matches].sort((a, b) => {
        // Upcoming matches first
        if (a.isResult !== b.isResult) {
          return a.isResult - b.isResult; // 0 (upcoming) before 1 (finished)
        }
        // Within same category, sort by date
        if (a.isResult === 0) {
          // Upcoming: earliest first
          return a.date.localeCompare(b.date);
        } else {
          // Finished: newest first
          return b.date.localeCompare(a.date);
        }
      });
      setMatches(sorted);
      applyFilters(sorted, filters);
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
    if (match.homeScore !== undefined && match.homeScore !== null && 
        match.awayScore !== undefined && match.awayScore !== null) {
      return `${match.homeScore}-${match.awayScore}`;
    }
    return 'vs';
  };

  const getVenueInfo = (marinosSide?: string) => {
    if (marinosSide === 'home') return { label: 'HOME', color: 'bg-blue-600 text-white' };
    if (marinosSide === 'away') return { label: 'AWAY', color: 'bg-red-600 text-white' };
    return { label: 'OTHER', color: 'bg-gray-500 text-white' };
  };

  const getGoogleMapsUrl = (stadium?: string) => {
    if (!stadium) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stadium)}`;
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
            {isLoading && (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                試合情報を読み込み中...
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="outline"
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              公式から取得
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
        {isLoading ? (
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
                試合情報が見つかりません。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map((match) => {
              const venueInfo = getVenueInfo(match.marinosSide);
              const isFinished = match.isResult === 1;
              const mapsUrl = getGoogleMapsUrl(match.stadium);
              
              return (
                <Card 
                  key={match.id || match.sourceKey} 
                  className={`hover:shadow-md transition-shadow ${isFinished ? 'border-l-4 border-l-gray-400' : 'border-l-4 border-l-green-500'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0">
                        {/* 大会名・節情報 + H/A */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${venueInfo.color}`}>
                            {venueInfo.label}
                          </span>
                          {match.competition && (
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded dark:bg-slate-800 dark:text-slate-300">
                              {match.competition}
                            </span>
                          )}
                          {isFinished ? (
                            <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded dark:bg-gray-700 dark:text-gray-300">
                              終了
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded dark:bg-green-900 dark:text-green-300">
                              予定
                            </span>
                          )}
                        </div>
                        
                        {/* 対戦カード */}
                        <div className="font-semibold text-lg text-foreground">
                          横浜FM vs {match.opponent}
                        </div>
                        
                        {/* 日時・会場 */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(match.date)}
                          </span>
                          {match.kickoff && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {match.kickoff}
                            </span>
                          )}
                          {match.stadium && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {mapsUrl ? (
                                <a 
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline dark:text-blue-400"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {match.stadium}
                                </a>
                              ) : (
                                match.stadium
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* スコア */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${isFinished ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {formatScore(match)}
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
              );
            })}
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
                  {filteredMatches.filter(m => m.isResult === 1).length}
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
                  {filteredMatches.filter(m => m.isResult !== 1).length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
