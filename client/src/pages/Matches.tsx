import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { MatchFilter, type FilterState } from '@/components/MatchFilter';
import { toast } from 'sonner';
import { AdBanner } from '@/components/AdBanner';
import { MatchCard } from '@/components/MatchCard';
import { useAuth } from '@/_core/hooks/useAuth';

type AttendanceStatus = 'undecided' | 'attending' | 'not-attending';

interface Match {
  id: number;
  sourceKey: string;
  matchId?: string; // Issue #146: 新しいスキーマ対応
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
  ticketSalesStart?: string | null; // Issue #148: チケット販売開始日
  notes?: string | null; // Issue #146: 備考
}

const DEFAULT_PAGE_SIZE = 10;

type DisplayMode = 'both' | 'upcoming' | 'past';

export default function Matches() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('both');
  const [upcomingPageSize, setUpcomingPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [pastPageSize, setPastPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    opponent: '',
    marinosSide: 'all',
    watchedOnly: false,
  });
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, AttendanceStatus>>({});

  const getAttendanceStatus = (matchId: number | string): AttendanceStatus => {
    return attendanceStatus[String(matchId)] || 'undecided';
  };

  const handleAttendanceChange = useCallback((matchId: number | string, status: AttendanceStatus, navigate: boolean = false) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [String(matchId)]: status,
    }));
    if (navigate && status === 'attending') {
      setLocation(`/matches/${matchId}`);
    }
  }, [setLocation]);

  const handleNavigate = useCallback((matchId: number) => {
    setLocation(`/matches/${matchId}`);
  }, [setLocation]);

  // tRPC クエリ・ミューテーション
  const { data: matchesData, isLoading: isLoadingMatches, refetch } = trpc.matches.listOfficial.useQuery({
    teamId: user?.supportedTeamId ?? undefined,
  });
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

  // Separate upcoming and past matches
  const upcomingMatches = filteredMatches.filter(m => m.isResult !== 1);
  const pastMatches = filteredMatches.filter(m => m.isResult === 1);
  
  // Apply page size limits
  const displayedUpcoming = upcomingMatches.slice(0, upcomingPageSize);
  const displayedPast = pastMatches.slice(0, pastPageSize);
  
  const hasMoreUpcoming = upcomingMatches.length > upcomingPageSize;
  const hasMorePast = pastMatches.length > pastPageSize;
  
  const loadMoreUpcoming = () => setUpcomingPageSize(prev => prev + DEFAULT_PAGE_SIZE);
  const loadMorePast = () => setPastPageSize(prev => prev + DEFAULT_PAGE_SIZE);

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
      watchedOnly: false,
    });
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

  // Determine match result from Marinos perspective
  const getMatchResult = (match: Match): { result: 'win' | 'lose' | 'draw' | null; label: string; bgColor: string; textColor: string; borderColor: string } => {
    if (!match.isResult || match.homeScore === undefined || match.awayScore === undefined) {
      return { result: null, label: '', bgColor: '', textColor: '', borderColor: 'border-l-gray-400' };
    }

    const marinosScore = match.marinosSide === 'home' ? match.homeScore : match.awayScore;
    const opponentScore = match.marinosSide === 'home' ? match.awayScore : match.homeScore;

    if (marinosScore > opponentScore) {
      return { 
        result: 'win', 
        label: '勝', 
        bgColor: 'bg-blue-600', 
        textColor: 'text-white',
        borderColor: 'border-l-blue-500'
      };
    } else if (marinosScore < opponentScore) {
      return { 
        result: 'lose', 
        label: '負', 
        bgColor: 'bg-red-600', 
        textColor: 'text-white',
        borderColor: 'border-l-red-500'
      };
    } else {
      return { 
        result: 'draw', 
        label: '分', 
        bgColor: 'bg-gray-500', 
        textColor: 'text-white',
        borderColor: 'border-l-gray-500'
      };
    }
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">表示:</span>
              <Select value={displayMode} onValueChange={(val) => setDisplayMode(val as DisplayMode)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">両方</SelectItem>
                  <SelectItem value="upcoming">予定のみ</SelectItem>
                  <SelectItem value="past">過去のみ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isLoading && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                読み込み中...
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
              最新に更新
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
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                フィルター条件に合致する試合がありません。
              </p>
            </CardContent>
          </Card>
        ) : matches.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                試合情報が見つかりません。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-4 ${displayMode === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* 予定試合カラム */}
            {(displayMode === 'both' || displayMode === 'upcoming') && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  今後の予定
                  <span className="text-sm font-normal text-muted-foreground">
                    ({displayedUpcoming.length}/{upcomingMatches.length}件)
                  </span>
                </h2>
                <div className="space-y-2">
                  {displayedUpcoming.map((match) => (
                    <MatchCard
                      key={match.id || match.sourceKey}
                      match={match}
                      type="upcoming"
                      attendanceStatus={getAttendanceStatus(match.id)}
                      onAttendanceChange={handleAttendanceChange}
                      onNavigate={handleNavigate}
                    />
                  ))}
                  {displayedUpcoming.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">予定試合がありません</p>
                  )}
                  {hasMoreUpcoming && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={loadMoreUpcoming}
                    >
                      もっと見る（残り{upcomingMatches.length - upcomingPageSize}件）
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* 過去試合カラム */}
            {(displayMode === 'both' || displayMode === 'past') && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  過去の試合
                  <span className="text-sm font-normal text-muted-foreground">
                    ({displayedPast.length}/{pastMatches.length}件)
                  </span>
                </h2>
                <div className="space-y-2">
                  {displayedPast.map((match) => (
                    <MatchCard
                      key={match.id || match.sourceKey}
                      match={match}
                      type="past"
                      attendanceStatus={getAttendanceStatus(match.id)}
                      onAttendanceChange={handleAttendanceChange}
                      onNavigate={handleNavigate}
                    />
                  ))}
                  {displayedPast.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">過去の試合がありません</p>
                  )}
                  {hasMorePast && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={loadMorePast}
                    >
                      もっと見る（残り{pastMatches.length - pastPageSize}件）
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 広告バナー */}
        <AdBanner placement="matchLog" />

        {/* 統計情報 */}
        {filteredMatches.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
            <Card className="p-2">
              <div className="text-xs text-muted-foreground">全試合</div>
              <div className="text-lg font-bold">{filteredMatches.length}</div>
            </Card>
            <Card className="p-2">
              <div className="text-xs text-muted-foreground">予定</div>
              <div className="text-lg font-bold text-green-600">{upcomingMatches.length}</div>
            </Card>
            <Card className="p-2">
              <div className="text-xs text-muted-foreground">終了</div>
              <div className="text-lg font-bold">{pastMatches.length}</div>
            </Card>
            <Card className="p-2 border-l-4 border-l-blue-500">
              <div className="text-xs text-muted-foreground">勝ち</div>
              <div className="text-lg font-bold text-blue-600">
                {pastMatches.filter(m => getMatchResult(m).result === 'win').length}
              </div>
            </Card>
            <Card className="p-2 border-l-4 border-l-gray-400">
              <div className="text-xs text-muted-foreground">引分</div>
              <div className="text-lg font-bold text-gray-600">
                {pastMatches.filter(m => getMatchResult(m).result === 'draw').length}
              </div>
            </Card>
            <Card className="p-2 border-l-4 border-l-red-500">
              <div className="text-xs text-muted-foreground">負け</div>
              <div className="text-lg font-bold text-red-600">
                {pastMatches.filter(m => getMatchResult(m).result === 'lose').length}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
