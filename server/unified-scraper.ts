/**
 * 統合スクレイパー - 複数ソースから試合情報を取得
 * ベース：ユーザーが修正したserver.js
 * 
 * データソース：
 * 1. Jリーグ公式サイト (jleague.jp)
 * 2. Google Calendar (試合予定)
 * 3. Phew (soccer.phew.homeip.net) - 2024年・2025年対応
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

interface MatchFixture {
  source: 'jleague.jp' | 'google_calendar' | 'phew.homeip.net' | 'f-marinos.com';
  date: string; // ISO format: YYYY-MM-DD
  kickoff?: string; // HH:mm format
  competition?: string;
  roundLabel?: string;
  roundNumber?: number;
  stadium?: string;
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  isResult: boolean;
  marinosSide?: 'home' | 'away' | null;
  opponent?: string;
  matchUrl?: string;
  key?: string;
}

// ====== Helpers ======
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function normalizeSpaces(s: string | null | undefined): string {
  return String(s || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function parseJapaneseDateToISO(h4Text: string): string | null {
  const m = String(h4Text).match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (!m) return null;
  return `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`;
}

function parseRoundFromCompetition(competitionText: string): {
  competitionName: string | null;
  roundLabel: string | null;
  roundNumber: number | null;
} {
  const t = normalizeSpaces(competitionText);
  if (!t) return { competitionName: null, roundLabel: null, roundNumber: null };

  // Handle "第 1 節" or "第1節" or "MD7"
  const mRound = t.match(/第\s*(\d+)\s*節/);
  const mMD = t.match(/MD\s*(\d+)/);

  let roundNumber: number | null = null;
  let roundLabel: string | null = null;

  if (mRound) {
    roundNumber = Number(mRound[1]);
    roundLabel = `第${roundNumber}節`;
  } else if (mMD) {
    roundNumber = Number(mMD[1]);
    roundLabel = `MD${roundNumber}`;
  }

  // Strip round info from competition name
  let competitionName = t
    .replace(/第\s*\d+\s*節/g, '')
    .replace(/MD\s*\d+/g, '')
    .trim();

  return {
    competitionName: competitionName || t,
    roundLabel,
    roundNumber,
  };
}

const MARINOS_NAMES = new Set([
  '横浜FM',
  '横浜ＦＭ',
  '横浜F・マリノス',
  '横浜Ｆ・マリノス',
]);

function detectMarinosSide(home: string, away: string): {
  side: 'home' | 'away' | null;
  opponent: string | null;
} {
  const h = normalizeSpaces(home);
  const a = normalizeSpaces(away);

  const homeIs =
    MARINOS_NAMES.has(h) ||
    h.includes('横浜FM') ||
    h.includes('横浜ＦＭ') ||
    h.includes('横浜F・マリノス');
  const awayIs =
    MARINOS_NAMES.has(a) ||
    a.includes('横浜FM') ||
    a.includes('横浜ＦＭ') ||
    a.includes('横浜F・マリノス');

  if (homeIs && !awayIs) return { side: 'home', opponent: a };
  if (awayIs && !homeIs) return { side: 'away', opponent: h };
  return { side: null, opponent: null };
}

function makeAbsoluteUrl(href: string | null | undefined): string | null {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  return `https://www.jleague.jp${href?.startsWith('/') ? '' : '/'}${href}`;
}

/**
 * Normalize match URL for consistent deduplication.
 * Removes trailing slashes, query params, hash, and sub-paths like /ticket/, /player/
 */
export function normalizeMatchUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    
    // Remove sub-paths that don't affect match identity
    path = path.replace(
      /\/(ticket|player|live|photo|coach|stats|map|report|news|event|commentary)(\/.*)?$/i,
      '/'
    );
    
    // Remove trailing slashes
    path = path.replace(/\/+$/, '');
    
    // Reconstruct URL without query params and hash
    return `${parsed.protocol}//${parsed.host}${path}`;
  } catch {
    // If URL parsing fails, do basic normalization
    return url
      .replace(/\/(ticket|player|live|photo|coach|stats|map|report|news|event|commentary)(\/.*)?$/i, '')
      .replace(/\/+$/, '')
      .replace(/[?#].*$/, '');
  }
}

/**
 * Generate a stable unique key from match data.
 * Priority: normalized matchUrl > date+opponent+kickoff > date+opponent
 */
export function generateMatchKey(match: Partial<MatchFixture>): string {
  // If we have a matchUrl, use it as the basis
  if (match.matchUrl) {
    const normalized = normalizeMatchUrl(match.matchUrl);
    if (normalized) {
      // Extract match ID from URL if possible (e.g., /match/j/2025/12/01/)
      const matchIdMatch = normalized.match(/\/match\/[^/]+\/(\d{4}\/\d{2}\/\d{2})/);
      if (matchIdMatch) {
        return `jleague-${matchIdMatch[1].replace(/\//g, '-')}`;
      }
      // Use hash of normalized URL
      return `url-${simpleHash(normalized)}`;
    }
  }
  
  // Fallback: date + opponent + kickoff (more unique than date + opponent)
  const parts = [match.date || 'unknown'];
  if (match.opponent) parts.push(match.opponent);
  else if (match.away) parts.push(match.away);
  if (match.kickoff) parts.push(match.kickoff);
  if (match.competition) parts.push(match.competition.substring(0, 10));
  
  return parts.join('-');
}

/**
 * Simple hash function for string (for URL-based keys)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// ====== Fetch & Parse ======

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: { timeout?: number; maxRetries?: number; encoding?: string } = {}
): Promise<string | null> {
  const { timeout = 15000, maxRetries = 3, encoding } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await axios.get(url, {
        timeout,
        responseType: encoding ? 'arraybuffer' : 'text',
        headers: {
          'User-Agent': 'MarinosAwayLog/2.0 axios',
          'Accept-Language': 'ja,en;q=0.8',
        },
      });
      
      if (encoding) {
        return iconv.decode(res.data as Buffer, encoding);
      }
      return res.data;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.warn(`[Unified Scraper] Attempt ${attempt}/${maxRetries} failed for ${url}: ${errorMsg}`);
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await sleep(delay);
      }
    }
  }
  
  console.error(`[Unified Scraper] All ${maxRetries} attempts failed for ${url}`);
  return null;
}

async function fetchJleagueHtml(url: string): Promise<string | null> {
  return fetchWithRetry(url, { timeout: 15000, maxRetries: 3 });
}

async function scrapeMatchDetail(matchUrl: string | null | undefined): Promise<Partial<MatchFixture> | null> {
  if (!matchUrl) return null;

  const html = await fetchJleagueHtml(matchUrl);
  if (!html) return null;

  const $ = cheerio.load(html);

  // Score
  const homeScoreRaw =
    $('.matchScore .score.home').text().trim() ||
    $('.matchScore .home .score').text().trim();
  const awayScoreRaw =
    $('.matchScore .score.away').text().trim() ||
    $('.matchScore .away .score').text().trim();

  const homeScore =
    homeScoreRaw !== '' && !isNaN(Number(homeScoreRaw)) ? Number(homeScoreRaw) : null;
  const awayScore =
    awayScoreRaw !== '' && !isNaN(Number(awayScoreRaw)) ? Number(awayScoreRaw) : null;

  // Stadium
  let stadium =
    $('.stadiumInfo .stadiumName').text().trim() ||
    $('.matchData .stadium').text().trim();

  // Teams
  const home = normalizeSpaces($('.teamName.home').first().text());
  const away = normalizeSpaces($('.teamName.away').first().text());

  // Kickoff time
  const kickoffText = normalizeSpaces(
    $('.matchData .time').text() || $('.matchData .kickoff').text()
  );
  const kickoffMatch = kickoffText.match(/([01]\d|2[0-3]):[0-5]\d/);
  const kickoff = kickoffMatch ? kickoffMatch[0] : null;

  // Status
  const statusVal = $('.matchStatus').text().trim() || (Number.isFinite(homeScore) ? '試合終了' : 'vs');

  return {
    home,
    away,
    homeScore: homeScore ?? undefined,
    awayScore: awayScore ?? undefined,
    stadium: stadium || undefined,
    status: statusVal,
    kickoff: kickoff ?? undefined,
    isResult: Number.isFinite(homeScore) && Number.isFinite(awayScore),
  };
}

async function parseJleagueSearch(html: string): Promise<MatchFixture[]> {
  const $ = cheerio.load(html);
  let currentDateISO: string | null = null;
  let currentCompetitionRaw: string | null = null;
  const fixtures: MatchFixture[] = [];
  const processedUrls = new Set<string>();

  const elements = $('h4, h5, a, .score').toArray();

  for (const el of elements) {
    const $el = $(el);
    const tag = (el.tagName || '').toLowerCase();
    const className = $el.attr('class') || '';

    if (tag === 'h4') {
      const iso = parseJapaneseDateToISO(normalizeSpaces($el.text()));
      if (iso) currentDateISO = iso;
      continue;
    }

    if (tag === 'h5') {
      const t = normalizeSpaces($el.text());
      if (t) currentCompetitionRaw = t;
      continue;
    }

    const href = $el.attr('href') || '';
    if (!href.includes('/match/')) continue;

    // Normalize URL
    const matchBaseUrl = href.replace(
      /\/(ticket|player|live|photo|coach|stats|map|report|news|event|commentary)\/.*$/,
      '/'
    );
    const matchUrl = makeAbsoluteUrl(matchBaseUrl);

    if (!matchUrl || processedUrls.has(matchUrl)) continue;
    processedUrls.add(matchUrl);

    const anchorText = normalizeSpaces($el.text());

    if (
      !anchorText.includes('vs') &&
      !anchorText.match(/\d+\s*-\s*\d+/) &&
      anchorText.length < 5
    ) {
      continue;
    }

    const { competitionName, roundLabel: roundLabelParsed, roundNumber: roundNumberParsed } =
      parseRoundFromCompetition(currentCompetitionRaw || '');

    // Try to extract score from search page as fallback
    let homeScore: number | undefined;
    let awayScore: number | undefined;
    let isResult = false;
    const scoreMatch = anchorText.match(/(\d+)\s*-\s*(\d+)/);
    if (scoreMatch) {
      homeScore = Number(scoreMatch[1]);
      awayScore = Number(scoreMatch[2]);
      isResult = true;
    }

    fixtures.push({
      source: 'jleague.jp',
      date: currentDateISO || '',
      competition: competitionName || undefined,
      roundLabel: roundLabelParsed || undefined,
      roundNumber: roundNumberParsed || undefined,
      matchUrl,
      home: '',
      away: '',
      homeScore,
      awayScore,
      status: isResult ? '試合終了' : 'fetching',
      isResult,
      marinosSide: 'home',
    });
  }

  // Fetch details for all matches
  const detailedFixtures = await Promise.all(
    fixtures.map(async (f) => {
      const detail = await scrapeMatchDetail(f.matchUrl);
      if (detail) {
        const { side, opponent } = detectMarinosSide(detail.home || '', detail.away || '');
        return {
          ...f,
          ...detail,
          homeScore: detail.homeScore ?? f.homeScore,
          awayScore: detail.awayScore ?? f.awayScore,
          isResult: detail.isResult || f.isResult,
          marinosSide: side,
          opponent: opponent || undefined,
        } as MatchFixture;
      }
      return f;
    })
  );

  return detailedFixtures.filter((f) => f.marinosSide !== null);
}

async function fetchPhewFixtures(url: string): Promise<MatchFixture[]> {
  try {
    const html = await fetchWithRetry(url, { timeout: 10000, maxRetries: 3, encoding: 'euc-jp' });
    if (!html) return [];
    
    const $ = cheerio.load(html);
    const fixtures: MatchFixture[] = [];

    // Extract year from URL if possible
    const urlObj = new URL(url);
    const urlYear = urlObj.searchParams.get('year') || String(new Date().getFullYear());

    $('h2').each((_, h2) => {
      const competition = $(h2).text().trim();
      const $table = $(h2).next('table');
      if (!$table.length) return;

      $table.find('tr').each((__, tr) => {
        const $tds = $(tr).find('td');
        if ($tds.length < 3) return;

        const sideRaw = $tds.eq(0).text().trim(); // Ｈ or Ａ
        const dateRaw = $tds.eq(1).text().trim(); // 2/12 (水) 19:00
        const infoText = $tds.eq(2).text().trim();

        const dateMatch = dateRaw.match(/(\d+)\/(\d+)/);
        if (!dateMatch) return;

        const dateISO = `${urlYear}-${pad2(Number(dateMatch[1]))}-${pad2(Number(dateMatch[2]))}`;

        const kickoffMatch = dateRaw.match(/(\d{2}:\d{2})/);
        const kickoff = kickoffMatch ? kickoffMatch[0] : undefined;

        const stadiumMatch = infoText.match(/\(([^)]+)\)/);
        const stadium = stadiumMatch ? stadiumMatch[1] : undefined;

        const opponentMatch = infoText.match(/第\d+節\s+(.+?)戦/);
        const opponent = opponentMatch ? opponentMatch[1] : infoText.split('戦')[0].split(' ').pop();

        // Score parsing from Phew
        const scoreRow = $tds.eq(3).text().trim();
        let homeScore: number | undefined;
        let awayScore: number | undefined;
        let isResult = false;
        const scoreMatch = scoreRow.match(/(\d+)\s*[○●△]\s*(\d+)/);
        if (scoreMatch) {
          homeScore = Number(scoreMatch[1]);
          awayScore = Number(scoreMatch[2]);
          isResult = true;
        }

        fixtures.push({
          source: 'phew.homeip.net',
          date: dateISO,
          kickoff,
          competition,
          roundLabel: infoText.match(/第\d+節/)?.[0] || undefined,
          stadium,
          home: sideRaw === 'Ｈ' ? '横浜FM' : opponent || '',
          away: sideRaw === 'Ａ' ? '横浜FM' : opponent || '',
          homeScore,
          awayScore,
          status: isResult ? '試合終了' : 'vs',
          isResult,
          marinosSide: sideRaw === 'Ｈ' ? 'home' : 'away',
          opponent: opponent || undefined,
          matchUrl: $tds.eq(2).find('a').attr('href') || undefined,
          key: `phew-${dateISO}-${opponent}`,
        });
      });
    });

    return fixtures;
  } catch (e) {
    console.error('[Unified Scraper] Phew fetch failed:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

// ====== F-Marinos Official Site Scraper ======
async function fetchMarinosSchedule(): Promise<MatchFixture[]> {
  const SCHEDULE_URL = 'https://www.f-marinos.com/matches/schedule';
  
  try {
    const html = await fetchWithRetry(SCHEDULE_URL, { timeout: 15000, maxRetries: 3 });
    if (!html) return [];
    
    const $ = cheerio.load(html);
    const fixtures: MatchFixture[] = [];
    const currentYear = new Date().getFullYear();
    
    // Find all match blocks
    $('div:has(> .match-header)').each((_, matchBlock) => {
      const $block = $(matchBlock);
      const $header = $block.find('.match-header');
      
      // Home/Away
      const isHome = $header.find('.match-header-tag.is-home').length > 0;
      const isAway = $header.find('.match-header-tag.is-away').length > 0;
      const marinosSide = isHome ? 'home' : (isAway ? 'away' : null);
      
      // Stadium
      const stadium = normalizeSpaces($header.find('.match-header-place').text()) || undefined;
      
      // Date parsing - look for matchdate elements
      const $matchdate = $block.find('.matchdate');
      let dateStr = '';
      let kickoff = '';
      
      // Try different date formats
      const dateText = normalizeSpaces($matchdate.text());
      
      // Format: "2.6 [FRI] 19:00 Kick Off" or "2.14 [金]15:00 Kick Off"
      const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})/);
      if (dateMatch) {
        const month = pad2(Number(dateMatch[1]));
        const day = pad2(Number(dateMatch[2]));
        // J1 season runs Feb-Dec. Schedule page shows 2025 season (Feb 2025 - Dec 2025)
        // If current date is after Nov, upcoming matches in Jan-May are likely next year
        const now = new Date();
        const matchMonth = Number(dateMatch[1]);
        let year: number;
        
        if (now.getMonth() >= 10 && matchMonth <= 5) {
          // If we're in Nov/Dec and match is Jan-May, it's next year
          year = now.getFullYear() + 1;
        } else {
          // Otherwise use current year
          year = now.getFullYear();
        }
        dateStr = `${year}-${month}-${day}`;
      }
      
      // Kickoff time
      const timeMatch = dateText.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        kickoff = `${pad2(Number(timeMatch[1]))}:${timeMatch[2]}`;
      }
      
      // Opponent team name
      let opponentText = '';
      $block.find('.font-weight-bold').each((_, el) => {
        const text = $(el).text().trim();
        if (text && !text.includes('横浜') && !text.includes('マリノス') && !opponentText) {
          opponentText = text;
        }
      });
      
      const opponent = normalizeSpaces(opponentText) || undefined;
      
      // Competition (look for league info)
      let competition = '';
      const compText = $block.find('.font-size-xs, .font-size-sm').text();
      if (compText.includes('J1')) competition = 'J1リーグ';
      else if (compText.includes('ルヴァン')) competition = 'JリーグYBCルヴァンカップ';
      else if (compText.includes('天皇杯')) competition = '天皇杯';
      else if (compText.includes('ACL')) competition = 'ACL';
      
      if (dateStr && opponent) {
        fixtures.push({
          source: 'f-marinos.com',
          date: dateStr,
          kickoff: kickoff || undefined,
          competition: competition || undefined,
          stadium,
          home: marinosSide === 'home' ? '横浜FM' : opponent,
          away: marinosSide === 'away' ? '横浜FM' : opponent,
          status: 'vs',
          isResult: false,
          marinosSide,
          opponent,
          matchUrl: SCHEDULE_URL,
          key: `marinos-${dateStr}-${opponent}`,
        });
      }
    });
    
    console.log(`[Unified Scraper] Marinos official: ${fixtures.length} upcoming matches found`);
    return fixtures;
  } catch (e) {
    console.error('[Unified Scraper] Marinos official fetch failed:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

// ====== Main Export ======
export async function scrapeAllMatches(): Promise<{
  fixtures: MatchFixture[];
  results: MatchFixture[];
  upcoming: MatchFixture[];
  counts: { total: number; results: number; upcoming: number };
  errors: string[];
}> {
  // Data sources specified by user
  const JLEAGUE_URL_2026 = 'https://www.jleague.jp/match/search/?category%5B%5D=100yj1&category%5B%5D=j2j3&category%5B%5D=j1&category%5B%5D=leaguecup&category%5B%5D=j2&category%5B%5D=j3&category%5B%5D=playoff&category%5B%5D=j2playoff&category%5B%5D=J3jflplayoff&category%5B%5D=emperor&category%5B%5D=acle&category%5B%5D=acl2&category%5B%5D=acl&category%5B%5D=fcwc&category%5B%5D=supercup&category%5B%5D=asiachallenge&category%5B%5D=jwc&club%5B%5D=yokohamafm&year=2026';
  const JLEAGUE_URL_2025 = 'https://www.jleague.jp/match/search/?category%5B%5D=100yj1&category%5B%5D=j2j3&category%5B%5D=j1&category%5B%5D=leaguecup&category%5B%5D=j2&category%5B%5D=j3&category%5B%5D=playoff&category%5B%5D=j2playoff&category%5B%5D=J3jflplayoff&category%5B%5D=emperor&category%5B%5D=acle&category%5B%5D=acl2&category%5B%5D=acl&category%5B%5D=fcwc&category%5B%5D=supercup&category%5B%5D=asiachallenge&category%5B%5D=jwc&club%5B%5D=yokohamafm&year=2025';
  const PHEW_URL_2026 = 'http://soccer.phew.homeip.net/schedule/match/yearly/?start=0&sort=&team=%B2%A3%C9%CDFM&year=2026';
  const PHEW_URL_2025 = 'http://soccer.phew.homeip.net/schedule/match/yearly/?team=%B2%A3%C9%CDFM&year=2025';
  const PHEW_URL_2024 = 'http://soccer.phew.homeip.net/schedule/match/yearly/?team=%B2%A3%C9%CDFM&year=2024';

  const errors: string[] = [];
  const startTime = Date.now();

  try {
    const [jleagueHtml2026, jleagueHtml2025, phewFixtures2026, phewFixtures2025, phewFixtures2024, marinosFixtures] = await Promise.all([
      fetchJleagueHtml(JLEAGUE_URL_2026),
      fetchJleagueHtml(JLEAGUE_URL_2025),
      fetchPhewFixtures(PHEW_URL_2026),
      fetchPhewFixtures(PHEW_URL_2025),
      fetchPhewFixtures(PHEW_URL_2024),
      fetchMarinosSchedule(),
    ]);

    let jFixtures: MatchFixture[] = [];
    if (jleagueHtml2026) {
      const fixtures2026 = await parseJleagueSearch(jleagueHtml2026);
      jFixtures.push(...fixtures2026);
    }
    if (jleagueHtml2025) {
      const fixtures2025 = await parseJleagueSearch(jleagueHtml2025);
      jFixtures.push(...fixtures2025);
    }

    const phewFixtures = [...phewFixtures2026, ...phewFixtures2025, ...phewFixtures2024];
    
    console.log(`[Unified Scraper] Sources: JLeague=${jFixtures.length}, Phew=${phewFixtures.length}, Marinos=${marinosFixtures.length}`);

    // Merge logic
    const combinedMap = new Map<string, MatchFixture>();

    const addOrUpdate = (f: MatchFixture) => {
      if (!f.date) return;
      const existing = combinedMap.get(f.date);
      if (!existing) {
        combinedMap.set(f.date, f);
      } else {
        const competition = f.competition || existing.competition;
        const roundLabel = f.roundLabel || existing.roundLabel;

        if (!existing.isResult && f.isResult) {
          combinedMap.set(f.date, { ...existing, ...f, competition, roundLabel });
        } else if (existing.source !== 'jleague.jp' && f.source === 'jleague.jp') {
          combinedMap.set(f.date, {
            ...f,
            competition,
            roundLabel,
            homeScore: f.homeScore !== undefined ? f.homeScore : existing.homeScore,
            awayScore: f.awayScore !== undefined ? f.awayScore : existing.awayScore,
            isResult: f.isResult || existing.isResult,
            status: f.isResult || existing.isResult ? '試合終了' : f.status,
          });
        } else if (existing.isResult && f.isResult && f.source === 'jleague.jp') {
          combinedMap.set(f.date, { ...existing, ...f, competition, roundLabel });
        } else {
          combinedMap.set(f.date, { ...existing, ...f, competition, roundLabel });
        }
      }
    };

    // Priority: JLeague > Marinos > Phew (JLeague has most accurate data)
    marinosFixtures.forEach(addOrUpdate);
    phewFixtures.forEach(addOrUpdate);
    jFixtures.forEach(addOrUpdate);

    let fixtures = Array.from(combinedMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const results = fixtures.filter((f) => f.isResult);
    const upcoming = fixtures.filter((f) => !f.isResult);

    const elapsed = Date.now() - startTime;
    console.log(`[Unified Scraper] Completed in ${elapsed}ms - ${fixtures.length} matches (${results.length} results, ${upcoming.length} upcoming)`);

    return {
      fixtures,
      results,
      upcoming,
      counts: { total: fixtures.length, results: results.length, upcoming: upcoming.length },
      errors,
    };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error('[Unified Scraper] Critical error:', errorMsg);
    errors.push(`Critical: ${errorMsg}`);
    
    return {
      fixtures: [],
      results: [],
      upcoming: [],
      counts: { total: 0, results: 0, upcoming: 0 },
      errors,
    };
  }
}
