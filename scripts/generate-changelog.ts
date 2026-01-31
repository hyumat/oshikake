/**
 * Issue #71: CHANGELOG.md 自動生成スクリプト
 *
 * docs/release_notes.json から CHANGELOG.md を生成する。
 * 実行: npx tsx scripts/generate-changelog.ts  または  npm run release:changelog
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RELEASE_NOTES_PATH = resolve(__dirname, '../docs/release_notes.json');
const CHANGELOG_PATH = resolve(__dirname, '../CHANGELOG.md');

interface Change {
  type: string;
  scope: string;
  summary: string;
  issues?: string[];
  commits?: string[];
}

interface Release {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  changes: Change[];
}

interface ReleaseNotes {
  project: string;
  description?: string;
  releases: Release[];
}

const TYPE_LABELS: Record<string, string> = {
  feat: '新機能',
  fix: 'バグ修正',
  refactor: 'リファクタリング',
  chore: 'メンテナンス',
  docs: 'ドキュメント',
  test: 'テスト',
  perf: 'パフォーマンス改善',
  ci: 'CI/CD',
};

const SCOPE_LABELS: Record<string, string> = {
  frontend: 'フロントエンド',
  backend: 'バックエンド',
  fullstack: 'フルスタック',
  docs: 'ドキュメント',
  infra: 'インフラ',
  ci: 'CI/CD',
};

function formatIssueLinks(issues?: string[]): string {
  if (!issues || issues.length === 0) return '';
  return ' (' + issues.join(', ') + ')';
}

function generateRelease(release: Release): string {
  const lines: string[] = [];

  lines.push(`## [${release.version}] - ${release.date}`);
  lines.push('');
  lines.push(`**${release.title}**`);
  lines.push('');

  // Highlights
  lines.push('### ハイライト');
  lines.push('');
  for (const highlight of release.highlights) {
    lines.push(`- ${highlight}`);
  }
  lines.push('');

  // Group changes by type
  const grouped = new Map<string, Change[]>();
  for (const change of release.changes) {
    const key = change.type;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(change);
  }

  // Output in conventional order
  const typeOrder = ['feat', 'fix', 'refactor', 'perf', 'chore', 'docs', 'test', 'ci'];
  for (const type of typeOrder) {
    const changes = grouped.get(type);
    if (!changes) continue;

    const label = TYPE_LABELS[type] || type;
    lines.push(`### ${label}`);
    lines.push('');
    for (const change of changes) {
      const scope = SCOPE_LABELS[change.scope] || change.scope;
      const issueLinks = formatIssueLinks(change.issues);
      lines.push(`- **[${scope}]** ${change.summary}${issueLinks}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generate(notes: ReleaseNotes): string {
  const lines: string[] = [];

  lines.push('# Changelog');
  lines.push('');
  lines.push(`${notes.description || notes.project} の変更履歴です。`);
  lines.push('');
  lines.push('このファイルは \\`docs/release_notes.json\\` から自動生成されています。');
  lines.push('手動で編集しないでください。再生成: \\`npm run release:changelog\\`');
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const release of notes.releases) {
    lines.push(generateRelease(release));
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

// --- main ---

console.log('📝 CHANGELOG.md を生成中...\n');

let releaseNotes: ReleaseNotes;
try {
  const raw = readFileSync(RELEASE_NOTES_PATH, 'utf-8');
  releaseNotes = JSON.parse(raw);
} catch (e) {
  console.error(`❌ release_notes.json の読み込みに失敗: ${(e as Error).message}`);
  process.exit(1);
}

const changelog = generate(releaseNotes);
writeFileSync(CHANGELOG_PATH, changelog, 'utf-8');

console.log(`✅ CHANGELOG.md を生成しました (${releaseNotes.releases.length} リリース)`);
console.log(`   出力先: ${CHANGELOG_PATH}`);
