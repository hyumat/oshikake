/**
 * Test data for development and testing
 * Information source:
 * - Marinos Official Site (https://www.f-marinos.com/)
 * - J-League Official Site (https://www.jleague.jp/match/search/)
 */

import { config } from './_core/config';

export interface TestMatch {
  id: number;
  sourceKey: string;
  date: string;
  kickoff?: string;
  competition?: string;
  homeTeam: string;
  awayTeam: string;
  opponent: string;
  stadium?: string;
  marinosSide: 'home' | 'away';
  homeScore?: number;
  awayScore?: number;
  isResult: number;
  matchUrl?: string;
}

/**
 * Sample matches for testing and development
 * These are real matches from 2026 season (from Marinos official site)
 */
export const SAMPLE_MATCHES: TestMatch[] = [
  {
    id: 1,
    sourceKey: 'test-2025-12-06-kashima',
    date: '2025-12-06',
    kickoff: '14:00',
    competition: 'J1リーグ 第38節',
    homeTeam: '鹿島アントラーズ',
    awayTeam: '横浜F・マリノス',
    opponent: '鹿島アントラーズ',
    stadium: 'カシマスタジアム',
    marinosSide: 'away',
    homeScore: 2,
    awayScore: 1,
    isResult: 1,
    matchUrl: 'https://www.jleague.jp/match/j1/2025/120601/live',
  },
  {
    id: 2,
    sourceKey: 'test-2025-11-30-cerezo',
    date: '2025-11-30',
    kickoff: '14:00',
    competition: 'J1リーグ 第37節',
    homeTeam: '横浜F・マリノス',
    awayTeam: 'セレッソ大阪',
    opponent: 'セレッソ大阪',
    stadium: '日産スタジアム',
    marinosSide: 'home',
    homeScore: 3,
    awayScore: 1,
    isResult: 1,
    matchUrl: 'https://www.jleague.jp/match/j1/2025/113002/live',
  },
  {
    id: 3,
    sourceKey: 'test-2025-11-23-shonan',
    date: '2025-11-23',
    kickoff: '14:00',
    competition: 'J1リーグ 第36節',
    homeTeam: '湘南ベルマーレ',
    awayTeam: '横浜F・マリノス',
    opponent: '湘南ベルマーレ',
    stadium: 'レモンガススタジアム平塚',
    marinosSide: 'away',
    homeScore: 0,
    awayScore: 2,
    isResult: 1,
    matchUrl: 'https://www.jleague.jp/match/j1/2025/112301/live',
  },
  {
    id: 4,
    sourceKey: 'test-2025-11-09-kawasaki',
    date: '2025-11-09',
    kickoff: '15:00',
    competition: 'J1リーグ 第35節',
    homeTeam: '横浜F・マリノス',
    awayTeam: '川崎フロンターレ',
    opponent: '川崎フロンターレ',
    stadium: '日産スタジアム',
    marinosSide: 'home',
    homeScore: 2,
    awayScore: 2,
    isResult: 1,
    matchUrl: 'https://www.jleague.jp/match/j1/2025/110902/live',
  },
  {
    id: 5,
    sourceKey: 'test-2025-11-02-urawa',
    date: '2025-11-02',
    kickoff: '14:00',
    competition: 'J1リーグ 第34節',
    homeTeam: '浦和レッズ',
    awayTeam: '横浜F・マリノス',
    opponent: '浦和レッズ',
    stadium: '埼玉スタジアム2002',
    marinosSide: 'away',
    homeScore: 1,
    awayScore: 3,
    isResult: 1,
    matchUrl: 'https://www.jleague.jp/match/j1/2025/110201/live',
  },
  {
    id: 6,
    sourceKey: 'test-2026-02-06-machida',
    date: '2026-02-06',
    kickoff: '19:00',
    competition: 'J1リーグ 第1節',
    homeTeam: '横浜F・マリノス',
    awayTeam: 'FC町田ゼルビア',
    opponent: 'FC町田ゼルビア',
    stadium: '日産スタジアム',
    marinosSide: 'home',
    isResult: 0,
  },
  {
    id: 7,
    sourceKey: 'test-2026-02-14-kashima',
    date: '2026-02-14',
    kickoff: '15:00',
    competition: 'J1リーグ 第2節',
    homeTeam: '鹿島アントラーズ',
    awayTeam: '横浜F・マリノス',
    opponent: '鹿島アントラーズ',
    stadium: 'メルカリスタジアム',
    marinosSide: 'away',
    isResult: 0,
  },
  {
    id: 8,
    sourceKey: 'test-2026-02-21-urawa',
    date: '2026-02-21',
    kickoff: '',
    competition: 'J1リーグ 第3節',
    homeTeam: '横浜F・マリノス',
    awayTeam: '浦和レッズ',
    opponent: '浦和レッズ',
    stadium: '未定',
    marinosSide: 'home',
    isResult: 0,
  },
];

/**
 * Get sample matches for development
 * In production, this should be replaced with actual scraping
 */
export function getSampleMatches(): TestMatch[] {
  return SAMPLE_MATCHES.map(m => ({ ...m }));
}

/**
 * Check if we should use test data
 * Returns true if environment is development or test
 */
export function shouldUseTestData(): boolean {
  return config.env.isDevelopment || config.env.isTest;
}
