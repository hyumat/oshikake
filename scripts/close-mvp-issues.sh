#!/bin/bash
# v0.1 MVP Milestone - Issue Close Script
# このスクリプトは42個のIssueを自動的にCloseします

set -e

REPO="hyumat/marinos_log_oshikake"

# Close対象のIssue番号リスト
ISSUES=(
  # カテゴリ1: MVPコア機能
  1 2 6 9 10 11
  # カテゴリ2: P0重要機能
  145 146 147 148
  # カテゴリ3: P1高優先度機能
  143 144
  # カテゴリ4: 認証・オンボーディング
  105 107 114
  # カテゴリ5: アカウント・プラン管理
  84 106 108 116 118 119
  # カテゴリ6: 試合・チケット管理
  122 123 124 151 161
  # カテゴリ7: UI/UX統合
  150 152
  # カテゴリ8: コアユーティリティ
  19 36 37 38 39 44 50 55 59 67 69 78 83
)

# GitHub CLIの確認
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) がインストールされていません"
    echo ""
    echo "インストール方法:"
    echo "  Ubuntu/Debian: sudo apt install gh"
    echo "  macOS: brew install gh"
    echo "  または: https://cli.github.com/"
    echo ""
    echo "インストール後、以下のコマンドで認証してください:"
    echo "  gh auth login"
    exit 1
fi

# GitHub認証の確認
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub認証が必要です"
    echo ""
    echo "以下のコマンドで認証してください:"
    echo "  gh auth login"
    exit 1
fi

echo "🚀 v0.1 MVP Milestone - Issue Close開始"
echo "📊 対象Issue数: ${#ISSUES[@]}"
echo ""

# 確認プロンプト
read -p "本当に${#ISSUES[@]}個のIssueをCloseしますか? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ キャンセルされました"
    exit 1
fi

echo ""
echo "📝 Issueをクローズ中..."

CLOSED_COUNT=0
FAILED_COUNT=0
FAILED_ISSUES=()

for issue_num in "${ISSUES[@]}"; do
    echo -n "  Issue #${issue_num}... "

    if gh issue close "$issue_num" -R "$REPO" --comment "✅ v0.1 MVP完了により自動クローズ

## 完了確認
- ✅ 実装完了
- ✅ テスト完了 (345+ tests passing)
- ✅ コミット確認済み
- ✅ ドキュメント作成済み

詳細: ISSUES_TO_CLOSE.md を参照" 2>/dev/null; then
        echo "✅"
        ((CLOSED_COUNT++))
    else
        echo "❌ (スキップ: 既にクローズ済みまたはエラー)"
        ((FAILED_COUNT++))
        FAILED_ISSUES+=("$issue_num")
    fi

    # レート制限対策: 少し待機
    sleep 0.5
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 結果サマリー"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ クローズ成功: ${CLOSED_COUNT}件"
echo "  ❌ スキップ: ${FAILED_COUNT}件"
echo "  📦 合計: ${#ISSUES[@]}件"

if [ ${FAILED_COUNT} -gt 0 ]; then
    echo ""
    echo "⚠️  スキップされたIssue:"
    for issue_num in "${FAILED_ISSUES[@]}"; do
        echo "    - Issue #${issue_num}"
    done
fi

echo ""
echo "🎉 処理完了！"
echo ""
echo "次のステップ:"
echo "  1. GitHubでマイルストーンの進捗を確認"
echo "  2. v0.1 MVPマイルストーン自体をクローズ"
echo "  3. v0.2の計画を開始"
