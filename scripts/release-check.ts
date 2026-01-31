/**
 * Issue #71: リリースノート検証スクリプト
 *
 * docs/release_notes.json の構造と整合性を検証する。
 * 実行: npx tsx scripts/release-check.ts  または  npm run release:check
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RELEASE_NOTES_PATH = resolve(__dirname, '../docs/release_notes.json');
const SCHEMA_PATH = resolve(__dirname, '../docs/release_notes.schema.json');

interface Change {
  type: string;
  scope: string;
  summary: string;
  issues?: string[];
  commits?: string[];
  affectedFiles?: string[];
}

interface Deploy {
  environment: string;
  commit: string;
  url?: string;
  versionTag?: string;
}

interface Release {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  changes: Change[];
  deploy?: Deploy;
}

interface ReleaseNotes {
  project: string;
  description?: string;
  releases: Release[];
}

const VALID_TYPES = ['feat', 'fix', 'refactor', 'chore', 'docs', 'test', 'perf', 'ci'];
const VALID_SCOPES = ['frontend', 'backend', 'fullstack', 'docs', 'infra', 'ci'];
const VALID_ENVIRONMENTS = ['staging', 'production'];

let errors: string[] = [];
let warnings: string[] = [];

function error(msg: string) {
  errors.push(`ERROR: ${msg}`);
}

function warn(msg: string) {
  warnings.push(`WARN: ${msg}`);
}

function validateVersion(version: string, releaseIndex: number) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    error(`releases[${releaseIndex}].version "${version}" はセマンティックバージョン形式 (x.y.z) ではありません`);
  }
}

function validateDate(date: string, releaseIndex: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    error(`releases[${releaseIndex}].date "${date}" は YYYY-MM-DD 形式ではありません`);
    return;
  }
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    error(`releases[${releaseIndex}].date "${date}" は無効な日付です`);
  }
}

function validateChange(change: Change, releaseIndex: number, changeIndex: number) {
  const prefix = `releases[${releaseIndex}].changes[${changeIndex}]`;

  if (!VALID_TYPES.includes(change.type)) {
    error(`${prefix}.type "${change.type}" は不正です (有効値: ${VALID_TYPES.join(', ')})`);
  }

  if (!VALID_SCOPES.includes(change.scope)) {
    error(`${prefix}.scope "${change.scope}" は不正です (有効値: ${VALID_SCOPES.join(', ')})`);
  }

  if (!change.summary || change.summary.trim().length === 0) {
    error(`${prefix}.summary が空です`);
  }

  if (change.issues) {
    for (const issue of change.issues) {
      if (!/^#\d+$/.test(issue)) {
        error(`${prefix}.issues "${issue}" は "#数字" 形式ではありません`);
      }
    }
  }

  if (change.commits) {
    for (const commit of change.commits) {
      if (commit.length < 7) {
        error(`${prefix}.commits "${commit}" は7文字以上必要です`);
      }
    }
  }

  if (!change.issues || change.issues.length === 0) {
    warn(`${prefix}: 関連 Issue がリンクされていません`);
  }

  if (!change.commits || change.commits.length === 0) {
    warn(`${prefix}: 関連コミットがリンクされていません`);
  }
}

function validateRelease(release: Release, index: number) {
  validateVersion(release.version, index);
  validateDate(release.date, index);

  if (!release.title || release.title.trim().length === 0) {
    error(`releases[${index}].title が空です`);
  }

  if (!release.highlights || release.highlights.length === 0) {
    error(`releases[${index}].highlights が空です`);
  } else if (release.highlights.length < 3) {
    warn(`releases[${index}].highlights は3項目以上推奨 (現在: ${release.highlights.length})`);
  }

  if (!release.changes || release.changes.length === 0) {
    error(`releases[${index}].changes が空です`);
  } else {
    if (release.changes.length < 5) {
      warn(`releases[${index}].changes は5項目以上推奨 (現在: ${release.changes.length})`);
    }
    release.changes.forEach((change, ci) => validateChange(change, index, ci));
  }

  if (release.deploy) {
    if (!VALID_ENVIRONMENTS.includes(release.deploy.environment)) {
      error(`releases[${index}].deploy.environment "${release.deploy.environment}" は不正です`);
    }
    if (!release.deploy.commit || release.deploy.commit.length < 7) {
      error(`releases[${index}].deploy.commit が不正です`);
    }
    if (release.deploy.versionTag && !/^v\d+\.\d+\.\d+$/.test(release.deploy.versionTag)) {
      error(`releases[${index}].deploy.versionTag "${release.deploy.versionTag}" は "v{x.y.z}" 形式ではありません`);
    }
  }
}

function validateReleaseNotes(notes: ReleaseNotes) {
  if (!notes.project) {
    error('project フィールドが必要です');
  }

  if (!notes.releases || !Array.isArray(notes.releases)) {
    error('releases フィールドが配列である必要があります');
    return;
  }

  if (notes.releases.length === 0) {
    error('releases に最低1つのリリースが必要です');
    return;
  }

  // バージョンの重複チェック
  const versions = notes.releases.map(r => r.version);
  const duplicates = versions.filter((v, i) => versions.indexOf(v) !== i);
  if (duplicates.length > 0) {
    error(`バージョンが重複しています: ${duplicates.join(', ')}`);
  }

  // 日付の降順チェック
  for (let i = 1; i < notes.releases.length; i++) {
    if (notes.releases[i].date > notes.releases[i - 1].date) {
      warn(`releases の日付が降順ではありません: ${notes.releases[i - 1].version} (${notes.releases[i - 1].date}) → ${notes.releases[i].version} (${notes.releases[i].date})`);
    }
  }

  notes.releases.forEach((release, i) => validateRelease(release, i));
}

// --- main ---

console.log('🔍 リリースノート検証を開始...\n');

if (!existsSync(RELEASE_NOTES_PATH)) {
  console.error(`❌ ファイルが見つかりません: ${RELEASE_NOTES_PATH}`);
  process.exit(1);
}

if (!existsSync(SCHEMA_PATH)) {
  warn('JSON Schema ファイルが見つかりません: docs/release_notes.schema.json');
}

let releaseNotes: ReleaseNotes;
try {
  const raw = readFileSync(RELEASE_NOTES_PATH, 'utf-8');
  releaseNotes = JSON.parse(raw);
} catch (e) {
  console.error(`❌ JSON パースエラー: ${(e as Error).message}`);
  process.exit(1);
}

validateReleaseNotes(releaseNotes);

// 結果出力
const totalReleases = releaseNotes.releases?.length ?? 0;
const totalChanges = releaseNotes.releases?.reduce((sum, r) => sum + (r.changes?.length ?? 0), 0) ?? 0;

console.log(`📦 リリース数: ${totalReleases}`);
console.log(`📝 変更エントリ数: ${totalChanges}`);
console.log('');

if (warnings.length > 0) {
  console.log('⚠️  警告:');
  warnings.forEach(w => console.log(`  ${w}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ エラー:');
  errors.forEach(e => console.log(`  ${e}`));
  console.log('');
  console.log(`検証失敗: ${errors.length} 件のエラー`);
  process.exit(1);
} else {
  console.log('✅ リリースノートの検証に成功しました');
  process.exit(0);
}
