/**
 * Jリーグ公式サイトからマリノスの試合情報をスクレイピングするモジュール
 * 
 * 戦略:
 * 1. 試合一覧ページから試合リンクを抽出
 * 2. 各試合詳細ページから詳細情報を取得
 * 3. 複数のセレクタでフォールバック検索
 * 4. 詳細なエラーログを記録
 */

import * as cheerio from 'cheerio';

// ============ Types ============

export interface RawMatchData {
  sourceKey: string;
  date: string;
  kickoff?: string;
  competition?: string;
  roundLabel?: string;
  roundNumber?: number;
  homeTeam: string;
  awayTeam: string;
  opponent: string;
  stadium?: string;
  marinosSide?: 'home' | 'away';
  homeScore?: number;
  awayScore?: number;
  status?: string;
  isResult: boolean;
  matchUrl: string;
}

export interface ScrapingError {
  url: string;
  message: string;
  timestamp: Date;
}

// ============ Constants ============

const JLEAGUE_SEARCH_URL = 'https://www.jleague.jp/match/search/all/all/yokohamafm/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const MARINOS_NAMES = new Set([
  '横浜FM',
  '横浜ＦＭ',
  '横浜F・マリノス',
  '横浜Ｆ・マリノス',
]);

// ============ Utility Functions ============

/**
 * 文字列を正規化（スペース、改行を削除）
 */
function normalizeText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/[\s\n\r]+/g, ' ')
    .trim();
}

/**
 * マリノスの名前かどうかを判定
 */
function isMarinosName(name: string): boolean {
  const normalized = normalizeText(name);
  return MARINOS_NAMES.has(normalized) || 
         normalized.includes('横浜') && (normalized.includes('FM') || normalized.includes('ＦＭ'));
}

/**
 * ホーム/アウェイを判定
 */
function detectMarinosSide(homeTeam: string, awayTeam: string): 'home' | 'away' | null {
  if (isMarinosName(homeTeam)) return 'home';
  if (isMarinosName(awayTeam)) return 'away';
  return null;
}

/**
 * 相手チーム名を抽出
 */
function deriveOpponent(homeTeam: string, awayTeam: string): string {
  const home = normalizeText(homeTeam);
  const away = normalizeText(awayTeam);
  
  if (isMarinosName(home) && away) return away;
  if (isMarinosName(away) && home) return home;
  return away || home || '';
}

/**
 * URLを絶対URLに変換
 */
function makeAbsoluteUrl(href: string): string {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  return `https://www.jleague.jp${href.startsWith('/') ? '' : '/'}${href}`;
}

/**
 * 試合本体URLを正規化（/match/cat/year/id/）
 */
function toMatchBaseUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/^(https?:\/\/[^/]+)?(\/match\/[^/]+\/\d{4}\/\d+\/)/i);
  if (!match) return null;
  return `https://www.jleague.jp${match[2]}`;
}

/**
 * 数字を抽出（スコア用）
 */
function extractNumber(text: string): number | null {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * 日付を ISO 形式に変換（例：2025年2月12日 -> 2025-02-12）
 */
function parseJapaneseDateToISO(text: string): string | null {
  const match = text.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * タイムアウト付きfetch
 */
async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * リトライ付きfetch
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<string> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(url);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
      }
    }
  }
  
  throw lastError || new Error('Unknown error');
}

// ============ Scraping Functions ============

/**
 * 試合一覧ページから試合リンクを抽出
 */
export async function fetchMatchListPage(): Promise<{ matches: string[]; errors: ScrapingError[] }> {
  const errors: ScrapingError[] = [];
  const matches: string[] = [];
  
  try {
    const html = await fetchWithRetry(JLEAGUE_SEARCH_URL);
    const $ = cheerio.load(html);
    
    // 試合詳細ページへのリンクを探す（/live/ を含むもの）
    const seenUrls = new Set<string>();
    
    $('a[href*="/match/"]').each((_, elem) => {
      const href = $(elem).attr('href');
      if (!href) return;
      
      const absoluteUrl = makeAbsoluteUrl(href);
      const baseUrl = toMatchBaseUrl(absoluteUrl);
      
      // /live/ を含むリンクのみを対象
      if (baseUrl && /\/live\/$/.test(baseUrl)) {
        if (!seenUrls.has(baseUrl)) {
          seenUrls.add(baseUrl);
          matches.push(baseUrl);
        }
      }
    });
    
    console.log(`[Scraper] Found ${matches.length} unique match URLs`);
    
  } catch (err) {
    const error: ScrapingError = {
      url: JLEAGUE_SEARCH_URL,
      message: err instanceof Error ? err.message : String(err),
      timestamp: new Date(),
    };
    errors.push(error);
    console.error('[Scraper] Error fetching match list:', error.message);
  }
  
  return { matches, errors };
}

/**
 * 試合詳細ページから情報を抽出
 * ページタイトルから基本情報を抽出し、HTMLから補足情報を取得
 */
export async function fetchMatchDetail(matchUrl: string): Promise<{ data: Partial<RawMatchData> | null; error: ScrapingError | null }> {
  try {
    const html = await fetchWithRetry(matchUrl);
    const $ = cheerio.load(html);
    
    // タイトルから基本情報を抽出
    const title = $('title').text();
    console.log(`[Scraper] Processing: ${title.substring(0, 80)}`);
    
    // タイトル例：【公式】横浜FMvs新潟の試合結果・データ（明治安田Ｊ１リーグ：2025年2月15日）：Ｊリーグ公式サイト（J.LEAGUE.jp）
    
    // 日付を抽出
    const dateMatch = title.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    const date = dateMatch ? `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}` : '';
    
    // チーム名を抽出（タイトルから）
    // パターン1: 【公式】横浜FMvs新潟の試合結果
    // パターン2: 【公式】新潟vs横浜FMの試合結果
    let homeTeam = '';
    let awayTeam = '';
    
    const teamMatch = title.match(/【公式】(.+?)vs(.+?)の試合/);
    if (teamMatch) {
      homeTeam = normalizeText(teamMatch[1]);
      awayTeam = normalizeText(teamMatch[2]);
    }
    
    // チーム名が見つからない場合のフォールバック
    if (!homeTeam || !awayTeam) {
      // スキーマ.orgのデータを探す
      const schemaScripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < schemaScripts.length; i++) {
        try {
          const schemaData = JSON.parse($(schemaScripts[i]).html() || '{}');
          if (schemaData['@type'] === 'SportsEvent' && schemaData.homeTeam && schemaData.awayTeam) {
            homeTeam = normalizeText(schemaData.homeTeam.name);
            awayTeam = normalizeText(schemaData.awayTeam.name);
            break;
          }
        } catch {
          // スキーマパースエラーは無視
        }
      }
    }
    
    // スコアを探す
    let homeScore: number | null = null;
    let awayScore: number | null = null;
    
    // スコア要素を探す（複数のセレクタを試す）
    const scoreSelectors = [
      '.scoreload',
      '[class*="score"]',
      '.matchScore',
      '.result__score',
    ];
    
    for (const selector of scoreSelectors) {
      const scoreElements = $(selector);
      if (scoreElements.length > 0) {
        const scoreText = normalizeText(scoreElements.first().text());
        const scoreMatch = scoreText.match(/(\d+)\s*[-:]\s*(\d+)/);
        if (scoreMatch) {
          homeScore = parseInt(scoreMatch[1], 10);
          awayScore = parseInt(scoreMatch[2], 10);
          break;
        }
      }
    }
    
    // スタジアムを探す
    let stadium = '';
    const stadiumSelectors = [
      '.matchData__stadium',
      '.matchData__place',
      '.matchInfo__stadium',
      '[class*="stadium"]',
      '[class*="venue"]',
    ];
    for (const selector of stadiumSelectors) {
      const elem = $(selector).first();
      if (elem.length > 0) {
        stadium = normalizeText(elem.text());
        if (stadium) break;
      }
    }
    
    // マリノスのサイドを判定
    const marinosSide = detectMarinosSide(homeTeam, awayTeam);
    
    if (!marinosSide) {
      console.warn(`[Scraper] Could not determine Marinos side for: ${title}`);
      // マリノスが見つからない場合でも、基本情報は返す
      // ただし、この試合はマリノスに関連していない可能性がある
      return {
        data: null,
        error: {
          url: matchUrl,
          message: 'Marinos not found in match data',
          timestamp: new Date(),
        },
      };
    }
    
    // 相手チームを抽出
    const opponent = deriveOpponent(homeTeam, awayTeam);
    
    // ソースキーを生成（URLから）
    const sourceKey = matchUrl.match(/\/match\/([^/]+\/\d{4}\/\d+)/)?.[1] || '';
    
    // 試合結果かどうかを判定
    const isResult = homeScore !== null && awayScore !== null;
    
    // リーグ情報を抽出
    let competition = '';
    const compMatch = title.match(/（([^：]*)[：:].*）/);
    if (compMatch) {
      competition = normalizeText(compMatch[1]);
    }
    
    const data: Partial<RawMatchData> = {
      sourceKey,
      date,
      homeTeam,
      awayTeam,
      opponent,
      stadium: stadium || undefined,
      marinosSide,
      homeScore: homeScore !== null ? homeScore : undefined,
      awayScore: awayScore !== null ? awayScore : undefined,
      competition: competition || undefined,
      isResult,
      matchUrl,
    };
    
    console.log(`[Scraper] Extracted: ${opponent} (${date}) - Score: ${homeScore}-${awayScore}`);
    
    return { data, error: null };
    
  } catch (err) {
    const error: ScrapingError = {
      url: matchUrl,
      message: err instanceof Error ? err.message : String(err),
      timestamp: new Date(),
    };
    console.error('[Scraper] Error fetching match detail:', error.message);
    return { data: null, error };
  }
}

/**
 * 全試合情報をスクレイピング
 */
export async function scrapeAllMatches(): Promise<{
  matches: RawMatchData[];
  errors: ScrapingError[];
  stats: { total: number; success: number; failed: number };
}> {
  console.log('[Scraper] Starting scrape operation...');
  
  const errors: ScrapingError[] = [];
  const matches: RawMatchData[] = [];
  
  // ステップ1: 試合一覧ページから試合リンクを取得
  const { matches: matchUrls, errors: listErrors } = await fetchMatchListPage();
  errors.push(...listErrors);
  
  if (matchUrls.length === 0) {
    console.warn('[Scraper] No match URLs found');
    return {
      matches: [],
      errors,
      stats: { total: 0, success: 0, failed: 0 },
    };
  }
  
  console.log(`[Scraper] Processing ${matchUrls.length} matches...`);
  
  // ステップ2: 各試合詳細ページから情報を取得
  for (const matchUrl of matchUrls) {
    const { data, error } = await fetchMatchDetail(matchUrl);
    
    if (error) {
      errors.push(error);
    } else if (data && data.sourceKey) {
      matches.push(data as RawMatchData);
    }
    
    // レート制限対策：リクエスト間に遅延を設定
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const stats = {
    total: matchUrls.length,
    success: matches.length,
    failed: errors.length,
  };
  
  console.log(`[Scraper] Completed: ${stats.success} success, ${stats.failed} failed`);
  
  return { matches, errors, stats };
}
