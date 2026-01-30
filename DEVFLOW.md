# Oshikake 開発フロー

## ブランチ戦略

### ブランチ構成

```
main        (本番環境・リリース済みコード)
  ↑
develop     (開発中の最新・日常作業用)
```

### ブランチの役割

- **main**: 本番環境と同期。リリース済みの安定版コード。直接編集禁止。
- **develop**: 日常的な開発作業用。Replit/Claude Codeでの作業はすべてここで行う。

---

## 日常の開発フロー

### Replitでの作業

1. **developブランチにいることを確認**
   - Replit画面上部に「develop」と表示されていることを確認

2. **コードを編集・追加**
   - 通常通り開発作業を進める

3. **コミット**
   - Replitが自動的にコミット・プッシュ
   - 手動でコミットする場合：
     ```bash
     git add .
     git commit -m "feat: ○○機能を追加"
     git push origin develop
     ```

### Claude Codeでの作業

1. **developブランチで作業**
   ```bash
   git checkout develop
   git pull
   ```

2. **Claude Codeに指示**
   ```
   「developブランチで○○機能を実装してください」
   ```

3. **作業完了後プッシュ**
   ```bash
   git push origin develop
   ```

---

## リリースフロー（4月本番リリース時）

### ステップ1: GitHubでPull Request作成

1. **GitHubを開く**
   ```
   https://github.com/hyumat/oshikake
   ```

2. **「Compare & pull request」をクリック**
   - developブランチに最近プッシュがあると、画面上部に通知が表示される
   - もし表示されない場合：
     - 「Pull requests」タブ → 「New pull request」
     - base: `main` ← compare: `develop`

3. **PR内容を記入**
   
   **タイトル例:**
   ```
   Release v1.0.0
   ```
   
   **説明例:**
   ```
   ## リリース内容
   - 全J1/J2チーム対応完了
   - セキュリティ監査完了
   - パフォーマンステスト完了
   - ユーザー登録・ログイン機能実装
   - 試合記録・統計機能実装
   
   初回リリースです🎉
   ```

4. **「Create pull request」をクリック**

### ステップ2: レビュー＆マージ

1. **変更内容を確認**
   - 「Files changed」タブで差分を確認

2. **マージ実行**
   - 「Merge pull request」をクリック
   - 「Confirm merge」をクリック

3. **PRを閉じる**
   - 自動的に閉じられる

### ステップ3: タグ付け

Replitのシェルで以下を実行：

```bash
# mainブランチに切り替え
git checkout main

# 最新を取得
git pull

# バージョンタグを付ける
git tag -a v1.0.0 -m "Initial public release"

# タグをプッシュ
git push --tags

# developブランチに戻る
git checkout develop

# mainの変更をdevelopに取り込む
git merge main
```

### ステップ4: Replitでデプロイ

1. Replitで **mainブランチに切り替え**
2. **「Deploy」ボタン** をクリック
3. 本番環境へデプロイ 🚀
4. **developブランチに戻る**

---

## リリース後の機能追加フロー

リリース後も同じフローで開発を続けます：

1. **developブランチで新機能開発**
2. **準備ができたらPR作成** (develop → main)
3. **マージ後、タグ付け** (例: v1.1.0, v1.2.0)
4. **デプロイ**

### バージョニング

- **メジャーアップデート**: v2.0.0（大きな変更）
- **マイナーアップデート**: v1.1.0（新機能追加）
- **パッチ**: v1.0.1（バグ修正）

---

## トラブルシューティング

### 間違えてmainブランチで作業してしまった

```bash
# 変更を一時保存
git stash

# developブランチに移動
git checkout develop

# 変更を適用
git stash pop

# コミット・プッシュ
git add .
git commit -m "feat: ○○を追加"
git push origin develop
```

### PRがマージできない（コンフリクト）

```bash
# developブランチで最新のmainを取り込む
git checkout develop
git pull origin main

# コンフリクトを解決
# （該当ファイルを編集）

# 解決後コミット
git add .
git commit -m "fix: コンフリクト解消"
git push origin develop
```

### 緊急バグ修正（本番で問題発生）

```bash
# mainから直接hotfixブランチ作成
git checkout main
git checkout -b hotfix/critical-bug

# 修正作業
# ...

# GitHubでPR作成: hotfix/critical-bug → main
# マージ後、developにも反映
git checkout develop
git merge main
```

---

## 重要な注意点

### ✅ やるべきこと

- 日常的な開発は必ず **developブランチ** で行う
- リリース前に **セキュリティ・パフォーマンステスト** を実施
- リリース時は必ず **PRを作成** してレビュー
- 重要なマイルストーンで **タグを付ける**

### ❌ やってはいけないこと

- mainブランチに直接コミット・プッシュ
- PRをスキップしてdevelopからmainに直接マージ
- タグを削除・変更（歴史は消さない）
- force push（特にmainブランチ）

---

## チェックリスト

### リリース前チェックリスト

- [ ] セキュリティ監査完了
- [ ] 全J1/J2チームデータ整備完了
- [ ] パフォーマンステスト実施
- [ ] ドキュメント作成・更新
- [ ] エラーハンドリング確認
- [ ] レスポンシブデザイン確認
- [ ] 本番環境の環境変数設定確認

### リリース後チェックリスト

- [ ] 本番環境でログイン動作確認
- [ ] 主要機能の動作確認
- [ ] エラーログ確認
- [ ] パフォーマンス監視開始
- [ ] ユーザーフィードバック収集準備

---

## 参考リンク

- **GitHubリポジトリ**: https://github.com/hyumat/oshikake
- **Replitプロジェクト**: [Replitのリンク]
- **本番環境**: [デプロイ後のURL]

---

## バージョン履歴

| バージョン | リリース日 | 主な変更内容 |
|-----------|-----------|-------------|
| v1.0.0    | 2026/04   | 初回リリース |

---

**作成日**: 2026年1月30日  
**最終更新**: 2026年1月30日
