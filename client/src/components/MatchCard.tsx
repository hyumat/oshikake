import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Calendar, Clock, Check, X } from 'lucide-react';
import { formatDateTime } from '@shared/formatters';
import { getTicketSalesStatus, getMatchCountdown } from '@/lib/matchHelpers';

type AttendanceStatus = 'undecided' | 'attending' | 'not-attending';

interface Match {
  id: number;
  sourceKey: string;
  matchId?: string;
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
  ticketSalesStart?: string | null;
  notes?: string | null;
}

interface MatchCardProps {
  match: Match;
  type: 'upcoming' | 'past';
  attendanceStatus: AttendanceStatus;
  onAttendanceChange: (matchId: number | string, status: AttendanceStatus, navigate?: boolean) => void;
  onNavigate: (matchId: number) => void;
}

const getVenueInfo = (marinosSide?: string) => {
  if (marinosSide === 'home') return { label: 'HOME', color: 'bg-blue-600 text-white' };
  if (marinosSide === 'away') return { label: 'AWAY', color: 'bg-red-600 text-white' };
  return { label: 'OTHER', color: 'bg-gray-500 text-white' };
};

const getGoogleMapsUrl = (stadium?: string) => {
  if (!stadium) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stadium)}`;
};

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

function UpcomingMatchCardContent({ match, attendanceStatus, onAttendanceChange, onNavigate }: Omit<MatchCardProps, 'type'>) {
  const venueInfo = getVenueInfo(match.marinosSide);
  const mapsUrl = getGoogleMapsUrl(match.stadium);
  const ticketStatus = getTicketSalesStatus(match.date, match.ticketSalesStart);

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
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
            <div className="font-medium text-sm">vs {match.opponent}</div>
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
            {ticketStatus.show && (
              <div className={`text-xs px-2 py-1 rounded border ${ticketStatus.bgColor} ${ticketStatus.color} mt-1`}>
                {ticketStatus.label}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {getMatchCountdown(match.date)}
            </div>
          </div>
          <AttendanceButton
            matchId={match.id}
            status={attendanceStatus}
            onAttendanceChange={onAttendanceChange}
            onNavigate={onNavigate}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PastMatchCardContent({ match, attendanceStatus, onAttendanceChange, onNavigate }: Omit<MatchCardProps, 'type'>) {
  const venueInfo = getVenueInfo(match.marinosSide);
  const mapsUrl = getGoogleMapsUrl(match.stadium);
  const matchResult = getMatchResult(match);

  const formatScore = (home?: number, away?: number) => {
    if (home === undefined || away === undefined) return '-';
    return `${home}-${away}`;
  };

  return (
    <Card className={`hover:shadow-md transition-shadow border-l-4 ${matchResult.borderColor}`}>
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
            <div className="font-medium text-sm">vs {match.opponent}</div>
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
            <PastAttendanceButton
              matchId={match.id}
              status={attendanceStatus}
              onAttendanceChange={onAttendanceChange}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PastAttendanceButton({ matchId, status, onAttendanceChange, onNavigate }: {
  matchId: number;
  status: AttendanceStatus;
  onAttendanceChange: (matchId: number | string, status: AttendanceStatus, navigate?: boolean) => void;
  onNavigate: (matchId: number) => void;
}) {
  if (status === 'attending') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => onNavigate(matchId)}
      >
        詳細
      </Button>
    );
  }
  
  if (status === 'not-attending') {
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
              onClick={() => onAttendanceChange(matchId, 'attending', false)}
            >
              <Check className="w-3 h-3 mr-2" />
              参加に変更
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start h-8 text-xs text-gray-600"
              onClick={() => onAttendanceChange(matchId, 'undecided', false)}
            >
              不明に変更
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  
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
            onClick={() => onAttendanceChange(matchId, 'attending', false)}
          >
            <Check className="w-3 h-3 mr-2" />
            参加
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onAttendanceChange(matchId, 'not-attending', false)}
          >
            <X className="w-3 h-3 mr-2" />
            不参加
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AttendanceButton({ matchId, status, onAttendanceChange, onNavigate }: {
  matchId: number;
  status: AttendanceStatus;
  onAttendanceChange: (matchId: number | string, status: AttendanceStatus, navigate?: boolean) => void;
  onNavigate: (matchId: number) => void;
}) {
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
              onClick={() => onAttendanceChange(matchId, 'attending', false)}
            >
              <Check className="w-3 h-3 mr-2" />
              参加
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onAttendanceChange(matchId, 'not-attending', false)}
            >
              <X className="w-3 h-3 mr-2" />
              不参加
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  
  if (status === 'attending') {
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
                onClick={() => onAttendanceChange(matchId, 'undecided', false)}
              >
                未定に戻す
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onAttendanceChange(matchId, 'not-attending', false)}
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
          onClick={() => onNavigate(matchId)}
        >
          詳細
        </Button>
      </div>
    );
  }
  
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
            onClick={() => onAttendanceChange(matchId, 'attending', false)}
          >
            <Check className="w-3 h-3 mr-2" />
            参加
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start h-8 text-xs text-gray-600 hover:text-gray-700"
            onClick={() => onAttendanceChange(matchId, 'undecided', false)}
          >
            未定に戻す
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const MatchCard = memo(function MatchCard({ match, type, attendanceStatus, onAttendanceChange, onNavigate }: MatchCardProps) {
  if (type === 'upcoming') {
    return (
      <UpcomingMatchCardContent
        match={match}
        attendanceStatus={attendanceStatus}
        onAttendanceChange={onAttendanceChange}
        onNavigate={onNavigate}
      />
    );
  }
  return (
    <PastMatchCardContent
      match={match}
      attendanceStatus={attendanceStatus}
      onAttendanceChange={onAttendanceChange}
      onNavigate={onNavigate}
    />
  );
});

export default MatchCard;
