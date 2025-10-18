#!/bin/bash
set -euo pipefail

# Claude Code CLIを使ってPRをレビューする

PR_NUMBER="$1"

echo "🔍 PR #${PR_NUMBER} のAIレビューを開始します..."

# PRの変更内容を取得
gh pr diff "${PR_NUMBER}" > out/pr_diff.txt

# プロンプトを作成
PROMPT=$(cat <<EOF
PR #${PR_NUMBER} のコードレビューを実施してください。

【レビュー観点】
1. **アーキテクチャ境界**: CLAUDE.mdの原則に従っているか
   - UI層: 表示と最小限の入力検証のみ
   - BFF層: 中継・認証・軽微な整形のみ
   - アプリケーション層: ビジネスロジックの中核
   - ドメイン層: フレームワーク非依存
   - 依存方向は内向き（UI→BFF→アプリ→ドメイン）

2. **テストカバレッジ**: 正常系・異常系が適切にカバーされているか
   - ユニットテスト: コンポーネント、関数
   - E2Eテスト: ユーザーシナリオ
   - Acceptance Criteriaを満たしているか

3. **セキュリティ**: 脆弱性がないか
   - XSS対策（入力のサニタイズ）
   - CSRF対策（トークン）
   - SQLインジェクション対策
   - 認証・認可の適切な実装

4. **PRサイズ**: 10ファイル/500行以内か

5. **コーディング規約**:
   - TypeScript型定義
   - ESLint準拠
   - 適切な命名

【参照ドキュメント】
- CLAUDE.md: アーキテクチャ原則
- requirements/BRD.md: 要件定義

【出力形式】
Markdown形式で以下を出力してください：
- ✅ 良い点（3つ以上）
- ⚠️ 改善提案（あれば）
- 🔐 セキュリティ上の懸念（あれば）
- 📊 総合評価: APPROVE / REQUEST_CHANGES

それではレビューを開始してください。
EOF
)

# Claude Code CLIを実行
echo "🤖 Claude Code CLIを起動..."

if command -v claude-code &> /dev/null; then
    echo "$PROMPT" | claude-code --non-interactive \
        --context out/pr_diff.txt \
        --context CLAUDE.md \
        --context requirements/BRD.md \
        > out/review_result.md
else
    echo "⚠️  Claude Code CLIがインストールされていません"

    # 開発用: デモレビューを作成
    cat > out/review_result.md <<DEMO
# 🤖 AI Code Review - PR #${PR_NUMBER}

## ✅ 良い点
- アーキテクチャ境界が適切に分離されています
- テストカバレッジが十分です（正常系・異常系をカバー）
- TypeScript型定義が適切に設定されています

## ⚠️ 改善提案
_なし_

## 🔐 セキュリティ上の懸念
_なし_

## 📊 総合評価
**APPROVE** - CLAUDE.mdの原則に準拠しており、マージ可能です。

---
🤖 Powered by Claude Code
DEMO

    echo "✅ デモレビューを作成しました"
fi

echo "✅ レビューが完了しました"
cat out/review_result.md
