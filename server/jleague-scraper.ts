import * as cheerio from 'cheerio';

const JLEAGUE_SEARCH_URL = 'https://www.jleague.jp/match/search/?category%5B%5D=100yj1&category%5B%5D=j2j3&category%5B%5D=j1&category%5B%5D=leaguecup&category%5B%5D=j2&category%5B%5D=j3&category%5B%5D=playoff&category%5B%5D=j2playoff&category%5B%5D=J3jflplayoff&category%5B%5D=emperor&category%5B%5D=acle&category%5B%5D=acl2&category%5B%5D=acl&category%5B%5D=fcwc&category%5B%5D=supercup&category%5B%5D=asiachallenge&category%5B%5D=jwc&club%5B%5D=yokohamafm&year=2025';

interface JLeagueMatch {
  date: string; // ISO format: YYYY-MM-DD
  kickoff?: string; // HH:mm format
  competition?: string;
  homeTeam: string;
  awayTeam: string;
  opponent: string;
  stadium?: string;
  marinosSide?: 'home' | 'away';
  homeScore?: number;
  awayScore?: number;
  isResult: boolean;
  sourceUrl: string;
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.log(`[J-League Scraper] Retry ${i + 1}/${maxRetries} for ${url}: HTTP ${response.status}`);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
        continue;
      }

      return await response.text();
    } catch (error) {
      console.log(`[J-League Scraper] Retry ${i + 1}/${maxRetries} for ${url}: ${error instanceof Error ? error.message : String(error)}`);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  return null;
}

function parseJapaneseDateToISO(dateStr: string, year: number): string | null {
  try {
    // Match patterns like "2月12日" or "2.12"
    const monthDayMatch = dateStr.match(/(\d{1,2})月(\d{1,2})日|(\d{1,2})\.(\d{1,2})/);
    if (!monthDayMatch) return null;

    let month: number;
    let day: number;

    if (monthDayMatch[1]) {
      // "2月12日" format
      month = parseInt(monthDayMatch[1], 10);
      day = parseInt(monthDayMatch[2], 10);
    } else {
      // "2.12" format
      month = parseInt(monthDayMatch[3], 10);
      day = parseInt(monthDayMatch[4], 10);
    }

    // Validate
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    // Create ISO date string
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  } catch {
    return null;
  }
}

function extractTeamName(text: string): string {
  // Check for Marinos variations
  if (text.includes('横浜FM') || text.includes('横浜F・マリノス') || text.includes('横浜Fマリノス')) {
    return '横浜FM';
  }

  // Common J-League teams
  const teams = [
    '鹿島アントラーズ', '浦和レッズ', '柏レイソル', 'FC東京', '東京ヴェルディ',
    'FC町田ゼルビア', '川崎フロンターレ', '横浜FC', '湘南ベルマーレ',
    'アルビレックス新潟', '清水エスパルス', '名古屋グランパス', '京都サンガF.C.',
    'ガンバ大阪', 'セレッソ大阪', 'ヴィッセル神戸', 'ファジアーノ岡山',
    'サンフレッチェ広島', 'アビスパ福岡', 'ジェフユナイテッド千葉', '水戸ホーリーホック'
  ];

  for (const team of teams) {
    if (text.includes(team)) return team;
  }

  return '';
}

function extractStadium(text: string): string | undefined {
  const stadiums = [
    '日産スタジアム', 'ニッパツ三ツ沢球技場', '横浜国際総合競技場',
    'メルカリスタジアム', 'MUFGスタジアム'
  ];

  for (const stadium of stadiums) {
    if (text.includes(stadium)) return stadium;
  }

  return undefined;
}

function extractCompetition(text: string): string | undefined {
  if (text.includes('J1')) return 'J1';
  if (text.includes('J2')) return 'J2';
  if (text.includes('J3')) return 'J3';
  if (text.includes('ルヴァン杯') || text.includes('リーグカップ')) return 'League Cup';
  if (text.includes('天皇杯')) return 'Emperor Cup';
  if (text.includes('ACL')) return 'ACL';
  if (text.includes('FCWC')) return 'FCWC';
  if (text.includes('スーパーカップ')) return 'Super Cup';
  return undefined;
}

export async function scrapeJLeagueMatches(): Promise<{
  matches: JLeagueMatch[];
  errors: Array<{ url: string; message: string; timestamp: Date }>;
  stats: { total: number; success: number; failed: number };
}> {
  const errors: Array<{ url: string; message: string; timestamp: Date }> = [];
  const matches: JLeagueMatch[] = [];

  try {
    console.log('[J-League Scraper] Fetching matches from', JLEAGUE_SEARCH_URL);
    const html = await fetchWithRetry(JLEAGUE_SEARCH_URL);

    if (!html) {
      errors.push({
        url: JLEAGUE_SEARCH_URL,
        message: 'Failed to fetch search page after retries',
        timestamp: new Date(),
      });
      return { matches, errors, stats: { total: 0, success: 0, failed: 1 } };
    }

    const $ = cheerio.load(html);
    const currentYear = new Date().getFullYear();

    // Find all match cards - they contain "試合終了" or "予定"
    const matchCardElements = $('a').filter((i, el) => {
      const text = $(el).text();
      return text.includes('試合終了') || text.includes('予定');
    });

    console.log(`[J-League Scraper] Found ${matchCardElements.length} match cards`);

    matchCardElements.each((index: number, element: any) => {
      try {
        const $card = $(element);
        const text = $card.text();

        // Extract date - look for "2月12日" or similar patterns
        const dateMatch = text.match(/(\d{1,2})月(\d{1,2})日/);
        if (!dateMatch) return;

        const dateStr = `${dateMatch[1]}月${dateMatch[2]}日`;
        const date = parseJapaneseDateToISO(dateStr, currentYear);
        if (!date) return;

        // Check if match is finished or scheduled
        const isResult = text.includes('試合終了');

        // Extract score - pattern: "1 試合終了 0" or "1 予定 0"
        const scoreMatch = text.match(/(\d+)\s*(?:試合終了|予定)\s*(\d+)/);
        let homeScore: number | undefined;
        let awayScore: number | undefined;

        if (scoreMatch && isResult) {
          homeScore = parseInt(scoreMatch[1], 10);
          awayScore = parseInt(scoreMatch[2], 10);
        }

        // Extract teams - split by score pattern
        const teamParts = text.split(/\d+\s*(?:試合終了|予定)\s*\d+/);
        if (teamParts.length < 2) return;

        const homeTeamText = teamParts[0].trim();
        const awayTeamText = teamParts[1].trim();

        const homeTeam = extractTeamName(homeTeamText);
        const awayTeam = extractTeamName(awayTeamText);

        if (!homeTeam || !awayTeam) return;

        // Determine if Marinos is home or away
        const marinosSide = homeTeam === '横浜FM' ? 'home' : awayTeam === '横浜FM' ? 'away' : undefined;
        if (!marinosSide) return;

        const opponent = marinosSide === 'home' ? awayTeam : homeTeam;

        // Extract stadium
        const stadium = extractStadium(text);

        // Extract competition
        const competition = extractCompetition(text);

        // Extract kickoff time if available
        const kickoffMatch = text.match(/(\d{1,2}):(\d{2})/);
        const kickoff = kickoffMatch ? `${kickoffMatch[1]}:${kickoffMatch[2]}` : undefined;

        const match: JLeagueMatch = {
          date,
          kickoff,
          competition,
          homeTeam,
          awayTeam,
          opponent,
          stadium,
          marinosSide,
          homeScore,
          awayScore,
          isResult,
          sourceUrl: JLEAGUE_SEARCH_URL,
        };

        matches.push(match);
      } catch (error) {
        console.log(`[J-League Scraper] Error parsing match ${index}:`, error);
      }
    });

    console.log(`[J-League Scraper] Extracted ${matches.length} matches`);
  } catch (error) {
    errors.push({
      url: JLEAGUE_SEARCH_URL,
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
    });
  }

  // Remove duplicates and sort by date
  const uniqueMatches = Array.from(
    new Map(matches.map(m => [m.date + m.opponent, m])).values()
  ).sort((a, b) => a.date.localeCompare(b.date));

  return {
    matches: uniqueMatches,
    errors,
    stats: {
      total: matches.length,
      success: uniqueMatches.length,
      failed: errors.length,
    },
  };
}
