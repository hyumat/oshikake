import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Plus, RefreshCw, MapPin, Calendar, Clock, Check, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { MatchFilter, type FilterState } from '@/components/MatchFilter';
import { toast } from 'sonner';
import { formatDateTime, formatScore } from '@shared/formatters';
import { shouldShowTicketInfo, getTicketSalesStatus, getMatchCountdown, isPastMatch, getTicketInfoFallback } from '@/lib/matchHelpers';
import { AdBanner } from '@/components/AdBanner';
import { AddMatchDialog } from '@/components/AddMatchDialog';
import { TicketFallbackMessage } from '@/components/TicketFallbackMessage';

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
  const [showAddMatchDialog, setShowAddMatchDialog] = useState(false);

  const getAttendanceStatus = (matchId: number | string): AttendanceStatus => {
    return attendanceStatus[String(matchId)] || 'undecided';
  };

  const handleAttendanceChange = (matchId: number | string, status: AttendanceStatus, navigate: boolean = false) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [String(matchId)]: status,
    }));
    if (navigate && status === 'attending') {
      setLocation(`/matches/${matchId}`);
    }
  };

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
              onClick={() => setShowAddMatchDialog(true)}
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
                  {displayedUpcoming.map((match) => {
                    const venueInfo = getVenueInfo(match.marinosSide);
                    const mapsUrl = getGoogleMapsUrl(match.stadium);
                    
                    return (
                      <Card 
                        key={match.id || match.sourceKey} 
                        className="hover:shadow-md transition-shadow border-l-4 border-l-green-500"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${venueInfo.color}`}>
                                  {venueInfo.label}
                                </span>
                                {match.competition && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded dark:bg-slate-800 dark:text-slate-300">
                                    {match.competition}
                                  </span>
                                )}
                              </div>
                              <div className="font-medium text-sm">
                                vs {match.opponent}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-0.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateTime(match.date, 'short')}
                                </span>
                                {match.kickoff && (
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />
                                    {match.kickoff}
                                  </span>
                                )}
                                {match.stadium && mapsUrl && (
                                  <a 
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-0.5 text-blue-600 hover:underline dark:text-blue-400"
                                  >
                                    <MapPin className="h-3 w-3" />
                                    {match.stadium}
                                  </a>
                                )}
                              </div>
                              {/* Issue #148/#124: チケット販売情報表示制御 + フォールバック */}
                              {(() => {
                                const ticketStatus = getTicketSalesStatus(match.date, match.ticketSalesStart);
                                if (ticketStatus.show) {
                                  return (
                                    <div className={`text-xs px-2 py-1 rounded border ${ticketStatus.bgColor} ${ticketStatus.color} mt-1`}>
                                      {ticketStatus.label}
                                    </div>
                                  );
                                }
                                // Issue #124: チケット情報未取得時のフォールバック
                                if (!isPastMatch(match.date) && !match.ticketSalesStart) {
                                  const fallback = getTicketInfoFallback(match.marinosSide, match.opponent);
                                  return (
                                    <div className="mt-2">
                                      <TicketFallbackMessage
                                        message={fallback.message}
                                        linkText={fallback.linkText}
                                        linkUrl={fallback.linkUrl}
                                      />
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              {/* 試合までのカウントダウン */}
                              <div className="text-xs text-muted-foreground mt-1">
                                {getMatchCountdown(match.date)}
                              </div>
                            </div>
                            {(() => {
                              const status = getAttendanceStatus(match.id);
                              if (status === 'undecided') {
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0 h-7 px-2 text-xs bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
                                      >
                                        観戦未定
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-1" align="end">
                                      <div className="flex flex-col gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="justify-start h-8 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
                                          onClick={() => handleAttendanceChange(match.id, 'attending', false)}
                                        >
                                          <Check className="w-3 h-3 mr-2" />
                                          参加
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => handleAttendanceChange(match.id, 'not-attending', false)}
                                        >
                                          <X className="w-3 h-3 mr-2" />
                                          不参加
                                        </Button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                );
                              } else if (status === 'attending') {
                                return (
                                  <div className="flex items-center gap-2">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="shrink-0 h-7 px-2 text-xs bg-green-100 border-green-400 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400"
                                        >
                                          <Check className="w-3 h-3 mr-1" />
                                          参加
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-1" align="end">
                                        <div className="flex flex-col gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="justify-start h-8 text-xs text-gray-600 hover:text-gray-700"
                                            onClick={() => handleAttendanceChange(match.id, 'undecided', false)}
                                          >
                                            未定に戻す
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleAttendanceChange(match.id, 'not-attending', false)}
                                          >
                                            <X className="w-3 h-3 mr-2" />
                                            不参加
                                          </Button>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => setLocation(`/matches/${match.id}`)}
                                    >
                                      詳細
                                    </Button>
                                  </div>
                                );
                              } else {
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0 h-7 px-2 text-xs bg-red-50 border-red-300 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400"
                                      >
                                        <X className="w-3 h-3 mr-1" />
                                        不参加
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-1" align="end">
                                      <div className="flex flex-col gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="justify-start h-8 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
                                          onClick={() => handleAttendanceChange(match.id, 'attending', false)}
                                        >
                                          <Check className="w-3 h-3 mr-2" />
                                          参加
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="justify-start h-8 text-xs text-gray-600 hover:text-gray-700"
                                          onClick={() => handleAttendanceChange(match.id, 'undecided', false)}
                                        >
                                          未定に戻す
                                        </Button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                );
                              }
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
                  {displayedPast.map((match) => {
                    const venueInfo = getVenueInfo(match.marinosSide);
                    const mapsUrl = getGoogleMapsUrl(match.stadium);
                    const matchResult = getMatchResult(match);
                    
                    return (
                      <Card 
                        key={match.id || match.sourceKey} 
                        className={`hover:shadow-md transition-shadow border-l-4 ${matchResult.borderColor}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${venueInfo.color}`}>
                                  {venueInfo.label}
                                </span>
                                {match.competition && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded dark:bg-slate-800 dark:text-slate-300">
                                    {match.competition}
                                  </span>
                                )}
                              </div>
                              <div className="font-medium text-sm">
                                vs {match.opponent}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-0.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateTime(match.date, 'short')}
                                </span>
                                {match.stadium && mapsUrl && (
                                  <a 
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-0.5 text-blue-600 hover:underline dark:text-blue-400"
                                  >
                                    <MapPin className="h-3 w-3" />
                                    {match.stadium}
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {matchResult.result && (
                                <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${matchResult.bgColor} ${matchResult.textColor}`}>
                                  {matchResult.label}
                                </span>
                              )}
                              <div className="text-lg font-bold w-12 text-center">
                                {formatScore(match.homeScore, match.awayScore)}
                              </div>
                              {(() => {
                                const status = getAttendanceStatus(match.id);
                                if (status === 'attending') {
                                  return (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => setLocation(`/matches/${match.id}`)}
                                    >
                                      詳細
                                    </Button>
                                  );
                                } else if (status === 'not-attending') {
                                  return (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-xs text-red-500"
                                        >
                                          不参加
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-1" align="end">
                                        <div className="flex flex-col gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="justify-start h-8 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
                                            onClick={() => handleAttendanceChange(match.id, 'attending', false)}
                                          >
                                            <Check className="w-3 h-3 mr-2" />
                                            参加に変更
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="justify-start h-8 text-xs text-gray-600"
                                            onClick={() => handleAttendanceChange(match.id, 'undecided', false)}
                                          >
                                            不明に変更
                                          </Button>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  );
                                } else {
                                  return (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-xs text-gray-400"
                                        >
                                          不明
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-1" align="end">
                                        <div className="flex flex-col gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="justify-start h-8 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
                                            onClick={() => handleAttendanceChange(match.id, 'attending', false)}
                                          >
                                            <Check className="w-3 h-3 mr-2" />
                                            参加
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleAttendanceChange(match.id, 'not-attending', false)}
                                          >
                                            <X className="w-3 h-3 mr-2" />
                                            不参加
                                          </Button>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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

        {/* 試合追加モーダル */}
        <AddMatchDialog
          open={showAddMatchDialog}
          onOpenChange={setShowAddMatchDialog}
          onSuccess={() => refetch()}
        />
      </div>
    </div>
  );
}
