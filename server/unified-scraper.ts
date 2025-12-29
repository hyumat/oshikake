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

// ====== Fetch & Parse ======
async function fetchJleagueHtml(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'MarinosAwayLog/2.0 axios',
        'Accept-Language': 'ja,en;q=0.8',
      },
    });
    return res.data;
  } catch (e) {
    console.error(`[Unified Scraper] Fetch failed: ${url}`, e instanceof Error ? e.message : String(e));
    return null;
  }
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
    const res = await axios.get(url, {
      timeout: 10000,
      responseType: 'arraybuffer',
    });
    const html = iconv.decode(res.data as Buffer, 'euc-jp');
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
    const res = await axios.get(SCHEDULE_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'MarinosAwayLog/2.0 axios',
        'Accept-Language': 'ja,en;q=0.8',
      },
    });
    
    const html = res.data;
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
        // For schedule page, matches are upcoming so use next year if month is before current month
        // But actually Marinos schedule shows 2025 season matches
        // Use 2025 as the base year for now (the current J1 season)
        const year = 2025;
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
}> {
  const BASE_URL = `https://www.jleague.jp/match/search/all/all/yokohamafm/`;
  const PHEW_URL_2025 = 'http://soccer.phew.homeip.net/schedule/match/yearly/?team=%B2%A3%C9%CDFM&year=2025';
  const PHEW_URL_2024 = 'http://soccer.phew.homeip.net/schedule/match/yearly/?team=%B2%A3%C9%CDFM&year=2024';

  try {
    const [jleagueHtml, phewFixtures2025, phewFixtures2024, marinosFixtures] = await Promise.all([
      fetchJleagueHtml(BASE_URL),
      fetchPhewFixtures(PHEW_URL_2025),
      fetchPhewFixtures(PHEW_URL_2024),
      fetchMarinosSchedule(),
    ]);

    let jFixtures: MatchFixture[] = [];
    if (jleagueHtml) {
      jFixtures = await parseJleagueSearch(jleagueHtml);
    }

    const phewFixtures = [...phewFixtures2025, ...phewFixtures2024];
    
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

    return {
      fixtures,
      results,
      upcoming,
      counts: { total: fixtures.length, results: results.length, upcoming: upcoming.length },
    };
  } catch (e) {
    console.error('[Unified Scraper] Error:', e instanceof Error ? e.message : String(e));
    throw e;
  }
}
