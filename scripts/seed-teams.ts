/**
 * Issue #72: J1/J2リーグ全チーム シードデータ投入スクリプト
 *
 * 既存チームはslugで検出し、新カラムのみ更新 (upsert)。
 * 新規チームはINSERT。
 *
 * 実行: npx tsx scripts/seed-teams.ts
 * 環境変数: DATABASE_URL が必要
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { eq } from 'drizzle-orm';
import { teams } from '../drizzle/schema';
import { allTeams } from './seed-teams-data';

const { Pool } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL 環境変数が設定されていません');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log(`🏟️  J1/J2 チームデータ投入を開始... (${allTeams.length} チーム)\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const team of allTeams) {
    try {
      // slug で既存チームを検索
      const existing = await db.select({ id: teams.id })
        .from(teams)
        .where(eq(teams.slug, team.slug))
        .limit(1);

      if (existing.length > 0) {
        // 既存チームのカラムを更新
        await db.update(teams)
          .set({
            name: team.name,
            shortName: team.shortName,
            aliases: team.aliases,
            league: team.league,
            emblemUrl: team.emblemUrl,
            primaryColor: team.primaryColor,
            secondaryColor: team.secondaryColor,
            stadiumName: team.stadiumName,
            stadiumAddress: team.stadiumAddress,
            stadiumCapacity: team.stadiumCapacity,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(teams.id, existing[0].id));
        updated++;
        console.log(`  ✏️  更新: ${team.name} (${team.league})`);
      } else {
        // 新規チームを挿入
        await db.insert(teams).values({
          name: team.name,
          shortName: team.shortName,
          slug: team.slug,
          aliases: team.aliases,
          league: team.league,
          emblemUrl: team.emblemUrl,
          primaryColor: team.primaryColor,
          secondaryColor: team.secondaryColor,
          stadiumName: team.stadiumName,
          stadiumAddress: team.stadiumAddress,
          stadiumCapacity: team.stadiumCapacity,
          isActive: true,
        });
        inserted++;
        console.log(`  ✅ 新規: ${team.name} (${team.league})`);
      }
    } catch (error) {
      console.error(`  ❌ エラー: ${team.name} - ${(error as Error).message}`);
      skipped++;
    }
  }

  console.log('\n📊 結果:');
  console.log(`  新規挿入: ${inserted} チーム`);
  console.log(`  更新: ${updated} チーム`);
  if (skipped > 0) console.log(`  スキップ: ${skipped} チーム`);
  console.log(`  合計: ${allTeams.length} チーム (J1: ${allTeams.filter(t => t.league === 'J1').length}, J2: ${allTeams.filter(t => t.league === 'J2').length})`);

  await pool.end();
  console.log('\n✅ 完了');
}

main().catch((err) => {
  console.error('❌ 予期しないエラー:', err);
  process.exit(1);
});
