import * as cheerio from 'cheerio';

const MARINOS_SCHEDULE_URL = 'https://www.f-marinos.com/match/schedule/';
const MARINOS_RESULTS_URL = 'https://www.f-marinos.com/match/result/';

// Fallback URLs if primary ones fail
const MARINOS_SCHEDULE_URL_FALLBACK = 'https://www.f-marinos.com/schedule';
const MARINOS_RESULTS_URL_FALLBACK = 'https://www.f-marinos.com/result';

interface MarinosMatch {
  date: string; // ISO format: YYYY-MM-DD
  kickoff?: string; // HH:mm format
  opponent: string;
  homeTeam: string;
  awayTeam: string;
  marinosSide: 'home' | 'away';
  stadium?: string;
  homeScore?: number;
  awayScore?: number;
  isResult: boolean;
  competition: string;
  round?: string;
  sourceUrl: string;
}

interface ScraperResult {
  matches: MarinosMatch[];
  errors: Array<{ url: string; message: string; timestamp: Date }>;
  stats: {
    total: number;
    success: number;
    failed: number;
  };
}

/**
 * Fetch HTML content from URL with retry logic
 */
async function fetchWithRetry(url: string, maxRetries = 3): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.log(`[Marinos Scraper] Retry ${i + 1}/${maxRetries} for ${url}: ${error}`);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  return null;
}

/**
 * Parse Japanese date format (e.g., "2.6" or "2.6 [金]") to ISO format
 * Assumes current year or next year based on context
 */
function parseJapaneseDateToISO(dateStr: string, currentYear: number): string | null {
  const match = dateStr.match(/(\d{1,2})\.(\d{1,2})/);
  if (!match) return null;

  const [, monthStr, dayStr] = match;
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Determine year: if month < current month, assume next year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  let year = currentYear;

  if (month < currentMonth) {
    year = currentYear + 1;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Scrape future matches from Marinos official site
 */
export async function scrapeMarinosFutureMatches(): Promise<ScraperResult> {
  const errors: Array<{ url: string; message: string; timestamp: Date }> = [];
  const matches: MarinosMatch[] = [];

  try {
    console.log('[Marinos Scraper] Fetching future matches from', MARINOS_SCHEDULE_URL);
    const html = await fetchWithRetry(MARINOS_SCHEDULE_URL);

    if (!html) {
      errors.push({
        url: MARINOS_SCHEDULE_URL,
        message: 'Failed to fetch schedule page after retries',
        timestamp: new Date(),
      });
      return { matches, errors, stats: { total: 0, success: 0, failed: 1 } };
    }

    const $ = cheerio.load(html);
    const currentYear = new Date().getFullYear();

    // Parse schedule table
    // Structure: Each match is in a row with date, home/away, opponent, stadium, kickoff
    const rows = $('table tbody tr, .match-row, [data-match]');

    console.log(`[Marinos Scraper] Found ${rows.length} potential match rows`);

    rows.each((index, element) => {
      try {
        const $row = $(element);
        const text = $row.text();

        // Look for date pattern (e.g., "2.6" or "2.14")
        const dateMatch = text.match(/(\d{1,2})\.(\d{1,2})/);
        if (!dateMatch) return;

        const dateStr = dateMatch[0];
        const date = parseJapaneseDateToISO(dateStr, currentYear);
        if (!date) return;

        // Determine home/away
        const isHome = text.includes('HOME') || text.includes('ホーム');
        const isAway = text.includes('AWAY') || text.includes('アウェイ');

        if (!isHome && !isAway) return;

        // Extract opponent (look for team names)
        let opponent = '';
        const teamNames = [
          'FC町田ゼルビア', '鹿島アントラーズ', '浦和レッズ', '東京ヴェルディ',
          'ジェフユナイテッド千葉', '水戸ホーリーホック', '川崎フロンターレ',
          '柏レイソル', 'FC東京', 'ガンバ大阪', 'アビスパ福岡', 'セレッソ大阪',
          'ヴィッセル神戸', 'サンフレッチェ広島', '京都サンガF.C.', '清水エスパルス',
          '横浜FC', '湘南ベルマーレ', 'ファジアーノ岡山', 'アルビレックス新潟',
          '名古屋グランパス',
        ];

        for (const team of teamNames) {
          if (text.includes(team)) {
            opponent = team;
            break;
          }
        }

        if (!opponent) return;

        // Extract stadium
        const stadiums = [
          '日産スタジアム', 'メルカリスタジアム', 'MUFGスタジアム',
          'ニッパツ三ツ沢球技場', '横浜国際総合競技場',
        ];
        let stadium = '';
        for (const s of stadiums) {
          if (text.includes(s)) {
            stadium = s;
            break;
          }
        }

        // Extract kickoff time
        const kickoffMatch = text.match(/(\d{1,2}):(\d{2})/);
        const kickoff = kickoffMatch ? `${kickoffMatch[1]}:${kickoffMatch[2]}` : undefined;

        // Extract competition
        const competition = text.includes('J1') ? 'J1' : 'Other';

        const match: MarinosMatch = {
          date,
          kickoff,
          opponent,
          homeTeam: isHome ? '横浜FM' : opponent,
          awayTeam: isHome ? opponent : '横浜FM',
          marinosSide: isHome ? 'home' : 'away',
          stadium,
          isResult: false,
          competition,
          sourceUrl: MARINOS_SCHEDULE_URL,
        };

        matches.push(match);
      } catch (error) {
        console.log(`[Marinos Scraper] Error parsing row ${index}:`, error);
      }
    });

    console.log(`[Marinos Scraper] Extracted ${matches.length} future matches`);
  } catch (error) {
    errors.push({
      url: MARINOS_SCHEDULE_URL,
      message: `Error scraping future matches: ${error}`,
      timestamp: new Date(),
    });
  }

  return {
    matches,
    errors,
    stats: {
      total: matches.length + errors.length,
      success: matches.length,
      failed: errors.length,
    },
  };
}

/**
 * Scrape past match results from Marinos official site
 */
export async function scrapeMarinosPastMatches(): Promise<ScraperResult> {
  const errors: Array<{ url: string; message: string; timestamp: Date }> = [];
  const matches: MarinosMatch[] = [];

  try {
    console.log('[Marinos Scraper] Fetching past matches from', MARINOS_RESULTS_URL);
    const html = await fetchWithRetry(MARINOS_RESULTS_URL);

    if (!html) {
      errors.push({
        url: MARINOS_RESULTS_URL,
        message: 'Failed to fetch results page after retries',
        timestamp: new Date(),
      });
      return { matches, errors, stats: { total: 0, success: 0, failed: 1 } };
    }

    const $ = cheerio.load(html);
    const currentYear = new Date().getFullYear();

    // Parse results table
    const rows = $('table tbody tr, .match-row, [data-match]');

    console.log(`[Marinos Scraper] Found ${rows.length} potential result rows`);

    rows.each((index, element) => {
      try {
        const $row = $(element);
        const text = $row.text();

        // Look for date pattern (e.g., "12.6" or "2.15")
        const dateMatch = text.match(/(\d{1,2})\.(\d{1,2})/);
        if (!dateMatch) return;

        const dateStr = dateMatch[0];
        const date = parseJapaneseDateToISO(dateStr, currentYear);
        if (!date) return;

        // Determine home/away
        const isHome = text.includes('HOME') || text.includes('ホーム');
        const isAway = text.includes('AWAY') || text.includes('アウェイ');

        if (!isHome && !isAway) return;

        // Extract opponent
        let opponent = '';
        const teamNames = [
          'FC町田ゼルビア', '鹿島アントラーズ', '浦和レッズ', '東京ヴェルディ',
          'ジェフユナイテッド千葉', '水戸ホーリーホック', '川崎フロンターレ',
          '柏レイソル', 'FC東京', 'ガンバ大阪', 'アビスパ福岡', 'セレッソ大阪',
          'ヴィッセル神戸', 'サンフレッチェ広島', '京都サンガF.C.', '清水エスパルス',
          '横浜FC', '湘南ベルマーレ', 'ファジアーノ岡山', 'アルビレックス新潟',
          '名古屋グランパス', 'リヴァプールFC', '上海申花', '上海海港', 'アルナスル',
          'ラインメール青森', '柏レイソル',
        ];

        for (const team of teamNames) {
          if (text.includes(team)) {
            opponent = team;
            break;
          }
        }

        if (!opponent) return;

        // Extract score (look for pattern like "2 - 1" or "2 1")
        const scoreMatch = text.match(/(\d+)\s*[-–]\s*(\d+)/);
        let homeScore: number | undefined;
        let awayScore: number | undefined;

        if (scoreMatch) {
          if (isHome) {
            homeScore = parseInt(scoreMatch[1], 10);
            awayScore = parseInt(scoreMatch[2], 10);
          } else {
            homeScore = parseInt(scoreMatch[2], 10);
            awayScore = parseInt(scoreMatch[1], 10);
          }
        }

        // Extract stadium
        const stadiums = [
          '日産スタジアム', 'ニッパツ三ツ沢球技場', '横浜国際総合競技場',
          'メルカリスタジアム', 'MUFGスタジアム',
        ];
        let stadium = '';
        for (const s of stadiums) {
          if (text.includes(s)) {
            stadium = s;
            break;
          }
        }

        // Extract competition
        let competition = 'J1';
        if (text.includes('ルヴァンカップ')) competition = 'ルヴァンカップ';
        else if (text.includes('天皇杯')) competition = '天皇杯';
        else if (text.includes('AFC')) competition = 'AFC';
        else if (text.includes('ワールドチャレンジ')) competition = 'ワールドチャレンジ';

        const match: MarinosMatch = {
          date,
          opponent,
          homeTeam: isHome ? '横浜FM' : opponent,
          awayTeam: isHome ? opponent : '横浜FM',
          marinosSide: isHome ? 'home' : 'away',
          stadium,
          homeScore,
          awayScore,
          isResult: true,
          competition,
          sourceUrl: MARINOS_RESULTS_URL,
        };

        matches.push(match);
      } catch (error) {
        console.log(`[Marinos Scraper] Error parsing result row ${index}:`, error);
      }
    });

    console.log(`[Marinos Scraper] Extracted ${matches.length} past matches`);
  } catch (error) {
    errors.push({
      url: MARINOS_RESULTS_URL,
      message: `Error scraping past matches: ${error}`,
      timestamp: new Date(),
    });
  }

  return {
    matches,
    errors,
    stats: {
      total: matches.length + errors.length,
      success: matches.length,
      failed: errors.length,
    },
  };
}

/**
 * Scrape all Marinos matches (future + past)
 */
export async function scrapeAllMarinosMatches(): Promise<ScraperResult> {
  const [futureResult, pastResult] = await Promise.all([
    scrapeMarinosFutureMatches(),
    scrapeMarinosPastMatches(),
  ]);

  const allMatches = [...futureResult.matches, ...pastResult.matches];

  // Remove duplicates based on date + opponent
  const uniqueMatches = Array.from(
    new Map(
      allMatches.map(m => [`${m.date}-${m.opponent}`, m])
    ).values()
  );

  // Sort by date
  uniqueMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    matches: uniqueMatches,
    errors: [...futureResult.errors, ...pastResult.errors],
    stats: {
      total: uniqueMatches.length,
      success: uniqueMatches.length,
      failed: futureResult.errors.length + pastResult.errors.length,
    },
  };
}
