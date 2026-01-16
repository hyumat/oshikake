#!/usr/bin/env tsx
/**
 * 環境変数検証スクリプト
 *
 * このスクリプトは、アプリケーション実行に必要な環境変数が正しく設定されているかを検証します。
 *
 * 実行方法:
 *   pnpm tsx scripts/validate-env.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

interface EnvVar {
  name: string;
  required: boolean;
  category: 'core' | 'database' | 'sheets' | 'stripe';
  description: string;
  validator?: (value: string) => boolean;
  example?: string;
}

const ENV_VARS: EnvVar[] = [
  // Core Application Settings
  {
    name: 'NODE_ENV',
    required: false,
    category: 'core',
    description: 'Node environment (development | production)',
    example: 'development',
  },
  {
    name: 'VITE_APP_ID',
    required: true,
    category: 'core',
    description: 'Manus App ID',
    validator: (v) => v.length > 0,
  },
  {
    name: 'JWT_SECRET',
    required: true,
    category: 'core',
    description: 'JWT signature secret (minimum 32 characters recommended)',
    validator: (v) => v.length >= 16,
  },
  {
    name: 'OAUTH_SERVER_URL',
    required: true,
    category: 'core',
    description: 'OAuth server URL',
    validator: (v) => v.startsWith('http://') || v.startsWith('https://'),
    example: 'https://oauth.repl.page',
  },

  // Database Configuration
  {
    name: 'DATABASE_URL',
    required: true,
    category: 'database',
    description: 'MySQL database connection URL',
    validator: (v) => v.startsWith('mysql://'),
    example: 'mysql://user:password@localhost:3306/marinos_db',
  },

  // Google Sheets Integration
  {
    name: 'GAS_API_URL',
    required: false,
    category: 'sheets',
    description: 'Google Apps Script API URL',
    validator: (v) => v.startsWith('https://script.google.com/'),
  },
  {
    name: 'GAS_API_TOKEN',
    required: false,
    category: 'sheets',
    description: 'Google Apps Script API token',
  },
  {
    name: 'SHEETS_SYNC_ENABLED',
    required: false,
    category: 'sheets',
    description: 'Enable Google Sheets auto-sync scheduler (default: true)',
    validator: (v) => ['true', 'false'].includes(v.toLowerCase()),
    example: 'true',
  },
  {
    name: 'SHEETS_SYNC_INTERVAL_MS',
    required: false,
    category: 'sheets',
    description: 'Sync interval in milliseconds (default: 3600000 = 1 hour)',
    validator: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0,
    example: '3600000',
  },
  {
    name: 'SHEETS_SYNC_ON_STARTUP',
    required: false,
    category: 'sheets',
    description: 'Run sync immediately on server startup (default: true)',
    validator: (v) => ['true', 'false'].includes(v.toLowerCase()),
    example: 'true',
  },

  // Stripe Payment Integration
  {
    name: 'STRIPE_SECRET_KEY',
    required: false,
    category: 'stripe',
    description: 'Stripe secret key',
    validator: (v) => v.startsWith('sk_'),
  },
  {
    name: 'STRIPE_PUBLISHABLE_KEY',
    required: false,
    category: 'stripe',
    description: 'Stripe publishable key',
    validator: (v) => v.startsWith('pk_'),
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: false,
    category: 'stripe',
    description: 'Stripe webhook secret',
    validator: (v) => v.startsWith('whsec_'),
  },
];

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  categoryStatus: Record<string, { ok: number; total: number; critical: boolean }>;
}

function loadEnvFile(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};

    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          env[key.trim()] = value.trim();
        }
      }
    });

    return env;
  } catch (error) {
    console.error(`${colors.red}${colors.bold}✗ エラー: .envファイルが見つかりません${colors.reset}`);
    console.log(`\n${colors.yellow}解決方法:${colors.reset}`);
    console.log('  cp .env.example .env');
    console.log('  # .envファイルを編集して必要な環境変数を設定してください');
    process.exit(1);
  }
}

function validateEnv(): ValidationResult {
  const env = loadEnvFile();
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    missing: [],
    categoryStatus: {
      core: { ok: 0, total: 0, critical: true },
      database: { ok: 0, total: 0, critical: true },
      sheets: { ok: 0, total: 0, critical: false },
      stripe: { ok: 0, total: 0, critical: false },
    },
  };

  for (const envVar of ENV_VARS) {
    const value = env[envVar.name];
    const category = result.categoryStatus[envVar.category];
    category.total++;

    if (!value || value === '') {
      if (envVar.required) {
        result.errors.push(
          `${colors.red}✗ ${envVar.name}${colors.reset}: 必須項目が設定されていません`
        );
        result.missing.push(envVar.name);
        result.success = false;
      } else {
        result.warnings.push(
          `${colors.yellow}⚠ ${envVar.name}${colors.reset}: オプション項目が設定されていません (${envVar.description})`
        );
      }
    } else {
      if (envVar.validator && !envVar.validator(value)) {
        result.errors.push(
          `${colors.red}✗ ${envVar.name}${colors.reset}: 値が不正です (${envVar.description})`
        );
        if (envVar.example) {
          result.errors.push(`  例: ${envVar.example}`);
        }
        result.success = false;
      } else {
        category.ok++;
        // Don't print every success to keep output clean
      }
    }
  }

  return result;
}

function printResults(result: ValidationResult): void {
  console.log(`\n${colors.bold}${colors.blue}=== 環境変数検証結果 ===${colors.reset}\n`);

  // Category status
  console.log(`${colors.bold}カテゴリ別状態:${colors.reset}`);
  const categories = {
    core: 'コア設定',
    database: 'データベース',
    sheets: 'Google Sheets連携',
    stripe: 'Stripe決済',
  };

  for (const [key, label] of Object.entries(categories)) {
    const status = result.categoryStatus[key];
    const percentage = status.total > 0 ? Math.round((status.ok / status.total) * 100) : 0;
    const color = percentage === 100 ? colors.green : status.critical ? colors.red : colors.yellow;
    const icon = percentage === 100 ? '✓' : status.critical ? '✗' : '⚠';

    console.log(`  ${color}${icon} ${label}${colors.reset}: ${status.ok}/${status.total} (${percentage}%)`);
  }

  // Errors
  if (result.errors.length > 0) {
    console.log(`\n${colors.bold}${colors.red}エラー:${colors.reset}`);
    result.errors.forEach((err) => console.log(`  ${err}`));
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log(`\n${colors.bold}${colors.yellow}警告:${colors.reset}`);
    result.warnings.forEach((warn) => console.log(`  ${warn}`));
  }

  // Summary
  console.log(`\n${colors.bold}総合結果:${colors.reset}`);
  if (result.success) {
    console.log(`  ${colors.green}${colors.bold}✓ 必須の環境変数は全て設定されています${colors.reset}`);

    if (result.warnings.length > 0) {
      console.log(`\n${colors.yellow}オプション機能を使用する場合は、対応する環境変数を設定してください。${colors.reset}`);
    }
  } else {
    console.log(`  ${colors.red}${colors.bold}✗ 必須の環境変数が不足しています${colors.reset}`);
    console.log(`\n${colors.yellow}次のステップ:${colors.reset}`);
    console.log(`  1. .envファイルを編集`);
    console.log(`  2. 不足している環境変数を設定`);
    console.log(`  3. 再度このスクリプトを実行`);

    if (result.missing.length > 0) {
      console.log(`\n${colors.yellow}不足している変数:${colors.reset}`);
      result.missing.forEach((name) => {
        const envVar = ENV_VARS.find((v) => v.name === name);
        console.log(`  - ${name}: ${envVar?.description}`);
        if (envVar?.example) {
          console.log(`    例: ${envVar.example}`);
        }
      });
    }
  }

  console.log();
}

// Main execution
const result = validateEnv();
printResults(result);

process.exit(result.success ? 0 : 1);
