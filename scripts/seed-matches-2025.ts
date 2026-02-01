/**
 * Issue #225: J1/J2 2025シーズン 試合データ生成・投入スクリプト
 *
 * ラウンドロビン（総当り）アルゴリズムで J1 (34節) / J2 (42節) の
 * 全試合スケジュールを生成し、matches テーブルに投入する。
 *
 * 実行: npx tsx scripts/seed-matches-2025.ts
 * 環境変数: DATABASE_URL が必要
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { eq, and } from 'drizzle-orm';
import { matches, seasons, teams } from '../drizzle/schema';
import { j1Teams, j2Teams, type TeamSeed } from './seed-teams-data';

const { Pool } = pg;

// ── 2025シーズン日程 ──────────────────────────────

/** J1: 2025/02/14 開幕 〜 2025/12/06 最終節 (34節) */
const J1_START = new Date('2025-02-14');
const J1_ROUNDS = 34;

/** J2: 2025/02/16 開幕 〜 2025/11/23 最終節 (42節) */
const J2_START = new Date('2025-02-16');
const J2_ROUNDS = 42;

// 中断期間（代表ウィーク等）をスキップする週
const SKIP_WEEKS_J1 = [6, 7, 14, 15, 22, 23, 30, 31]; // 3月下旬, 6月, 9月, 11月 の国際Aマッチウィーク
const SKIP_WEEKS_J2 = [6, 7, 14, 15, 22, 23, 30, 31, 38, 39];

// ── ラウンドロビン スケジュール生成 ──────────────

interface MatchFixture {
  round: number;
  homeSlug: string;
  awaySlug: string;
  date: string;         // YYYY-MM-DD
  kickoff: string;      // HH:MM
  competition: string;
  roundLabel: string;
  stadiumName: string;
}

/**
 * ラウンドロビン（総当り2回戦）のスケジュールを生成する。
 * circle method: https://en.wikipedia.org/wiki/Round-robin_tournament#Circle_method
 */
function generateRoundRobin(
  teamSlugs: string[],
  teamMap: Map<string, TeamSeed>,
  startDate: Date,
  totalRounds: number,
  skipWeeks: number[],
  competition: string,
): MatchFixture[] {
  const n = teamSlugs.length;
  const halfRounds = totalRounds / 2; // 前半戦の節数 = n-1
  const matchesPerRound = n / 2;

  // Circle method: 1チームを固定し、残りを回転
  const fixed = teamSlugs[0];
  const rotating = teamSlugs.slice(1);

  const firstHalf: Array<[string, string][]> = [];

  for (let round = 0; round < halfRounds; round++) {
    const pairings: [string, string][] = [];

    // 固定チーム vs 回転配列の先頭
    if (round % 2 === 0) {
      pairings.push([fixed, rotating[0]]);
    } else {
      pairings.push([rotating[0], fixed]);
    }

    // 残りのペアリング
    for (let i = 1; i <= matchesPerRound - 1; i++) {
      const home = rotating[i];
      const away = rotating[rotating.length - i];
      if (i % 2 === 0) {
        pairings.push([home, away]);
      } else {
        pairings.push([away, home]);
      }
    }

    firstHalf.push(pairings);

    // 回転配列を1つずらす
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  // 後半戦: H/A を入れ替え
  const secondHalf = firstHalf.map(pairings =>
    pairings.map(([h, a]) => [a, h] as [string, string])
  );

  const allRounds = [...firstHalf, ...secondHalf];

  // 日付の計算
  const fixtures: MatchFixture[] = [];
  let weekOffset = 0;

  for (let roundIdx = 0; roundIdx < allRounds.length; roundIdx++) {
    // スキップ週を避ける
    while (skipWeeks.includes(weekOffset)) {
      weekOffset++;
    }

    const roundDate = new Date(startDate);
    roundDate.setDate(roundDate.getDate() + weekOffset * 7);
    const dateStr = roundDate.toISOString().split('T')[0];

    const roundNumber = roundIdx + 1;
    const roundLabel = `第${roundNumber}節`;

    // キックオフ時間（交互に変える）
    const kickoffTimes = ['14:00', '15:00', '16:00', '18:00', '19:00'];

    for (let matchIdx = 0; matchIdx < allRounds[roundIdx].length; matchIdx++) {
      const [homeSlug, awaySlug] = allRounds[roundIdx][matchIdx];
      const homeTeam = teamMap.get(homeSlug);
      const kickoff = kickoffTimes[matchIdx % kickoffTimes.length];

      fixtures.push({
        round: roundNumber,
        homeSlug,
        awaySlug,
        date: dateStr,
        kickoff,
        competition,
        roundLabel,
        stadiumName: homeTeam?.stadiumName ?? '未定',
      });
    }

    weekOffset++;
  }

  return fixtures;
}

// ── メイン処理 ──────────────────────────────────

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL 環境変数が設定されていません');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  // ── 2025シーズン作成 ──
  console.log('📅 2025シーズンを作成...');
  const existingSeason = await db.select().from(seasons).where(eq(seasons.year, 2025)).limit(1);
  let seasonId: number;

  if (existingSeason.length > 0) {
    seasonId = existingSeason[0].id;
    console.log(`  既存シーズンを使用: id=${seasonId}`);
  } else {
    const [created] = await db.insert(seasons).values({
      year: 2025,
      label: '2025シーズン',
      startDate: '2025-02-14',
      endDate: '2025-12-06',
    }).returning();
    seasonId = created.id;
    console.log(`  新規作成: id=${seasonId}`);
  }

  // ── チームID取得 ──
  console.log('🏟️  チームデータを取得...');
  const dbTeams = await db.select({ id: teams.id, slug: teams.slug }).from(teams);
  const slugToId = new Map(dbTeams.map(t => [t.slug, t.id]));

  // チーム名→シードデータのマップ
  const allSeeds = [...j1Teams, ...j2Teams];
  const seedMap = new Map(allSeeds.map(t => [t.slug, t]));

  // ── J1 スケジュール生成 ──
  const j1Slugs = j1Teams.map(t => t.slug);
  console.log(`\n⚽ J1 スケジュール生成 (${j1Slugs.length}チーム, ${J1_ROUNDS}節)...`);
  const j1Fixtures = generateRoundRobin(j1Slugs, seedMap, J1_START, J1_ROUNDS, SKIP_WEEKS_J1, '明治安田J1リーグ');
  console.log(`  生成: ${j1Fixtures.length} 試合`);

  // ── J2 スケジュール生成 ──
  const j2Slugs = j2Teams.map(t => t.slug);
  console.log(`⚽ J2 スケジュール生成 (${j2Slugs.length}チーム, ${J2_ROUNDS}節)...`);
  const j2Fixtures = generateRoundRobin(j2Slugs, seedMap, J2_START, J2_ROUNDS, SKIP_WEEKS_J2, '明治安田J2リーグ');
  console.log(`  生成: ${j2Fixtures.length} 試合`);

  const allFixtures = [...j1Fixtures, ...j2Fixtures];

  // ── DB投入 ──
  console.log(`\n💾 データベースに投入 (合計 ${allFixtures.length} 試合)...`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const fixture of allFixtures) {
    const homeTeamId = slugToId.get(fixture.homeSlug);
    const awayTeamId = slugToId.get(fixture.awaySlug);
    const homeTeam = seedMap.get(fixture.homeSlug);
    const awayTeam = seedMap.get(fixture.awaySlug);

    if (!homeTeam || !awayTeam) {
      console.error(`  ❌ チーム未登録: ${fixture.homeSlug} vs ${fixture.awaySlug}`);
      errors++;
      continue;
    }

    const sourceKey = `jleague-2025-${fixture.homeSlug}-vs-${fixture.awaySlug}-r${fixture.round}`;
    const matchIdStr = `2025-${fixture.competition === '明治安田J1リーグ' ? 'j1' : 'j2'}-r${String(fixture.round).padStart(2, '0')}-${fixture.homeSlug}-${fixture.awaySlug}`;

    try {
      // 重複チェック
      const existing = await db.select({ id: matches.id })
        .from(matches)
        .where(eq(matches.sourceKey, sourceKey))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(matches).values({
        teamId: homeTeamId ?? null,
        seasonId,
        matchId: matchIdStr,
        date: fixture.date,
        opponent: awayTeam.name,
        homeScore: null,
        awayScore: null,
        stadium: fixture.stadiumName,
        kickoff: fixture.kickoff,
        competition: fixture.competition,
        roundLabel: fixture.roundLabel,
        roundNumber: fixture.round,
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        source: 'jleague',
        sourceKey,
        status: 'Scheduled',
        isResult: 0,
        marinosSide: fixture.homeSlug === 'yokohamafm' ? 'home'
                   : fixture.awaySlug === 'yokohamafm' ? 'away'
                   : null,
      });
      inserted++;
    } catch (err) {
      console.error(`  ❌ エラー (${fixture.roundLabel} ${homeTeam.shortName} vs ${awayTeam.shortName}): ${(err as Error).message}`);
      errors++;
    }
  }

  console.log('\n📊 結果:');
  console.log(`  挿入: ${inserted} 試合`);
  console.log(`  スキップ (重複): ${skipped} 試合`);
  if (errors > 0) console.log(`  エラー: ${errors} 試合`);
  console.log(`  合計: ${allFixtures.length} 試合 (J1: ${j1Fixtures.length}, J2: ${j2Fixtures.length})`);

  await pool.end();
  console.log('\n✅ 完了');
}

main().catch((err) => {
  console.error('❌ 予期しないエラー:', err);
  process.exit(1);
});
