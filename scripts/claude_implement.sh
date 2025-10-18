#!/bin/bash
set -euo pipefail

# Claude Code CLIを使ってIssueを実装する

ISSUE_NUMBER="$1"
FIX_MODE="${2:-}"

echo "🚀 Issue #${ISSUE_NUMBER} の実装を開始します..."

# Issue情報を取得
ISSUE_TITLE=$(jq -r '.title' out/current_issue.json)
ISSUE_BODY=$(jq -r '.body' out/current_issue.json)

# プロンプトを作成
PROMPT=$(cat <<EOF
Issue #${ISSUE_NUMBER}「${ISSUE_TITLE}」を実装してください。

【実装要件】
${ISSUE_BODY}

【CLAUDE.md準拠事項】
- TDD原則: テストを先に書いてから実装してください
- アーキテクチャ: UI/BFF/アプリケーション層/ドメイン層の責務を明確に分離
- PRサイズ: 10ファイル/500行以内に収めてください
- テスト: 正常系・異常系の両方をカバー
- フロントエンド: Next.js + TypeScript
- テストツール: Jest/Vitest（ユニット）+ Playwright（E2E）

【参照ドキュメント】
- CLAUDE.md: アーキテクチャ原則
- requirements/BRD.md: Acceptance Criteriaの詳細
- profiles/stack_frontend.md: フロントエンド技術スタック

【修正モード】
$(if [ "$FIX_MODE" = "--fix-failures" ]; then
    echo "前回のテストが失敗しました。エラーログを確認して修正してください。"
else
    echo "初回実装です。"
fi)

【実装手順】
1. requirements/BRD.md から該当機能のAcceptance Criteriaを確認
2. テストを先に作成（TDD原則）
3. 実装を進める
4. テストを実行して全て成功することを確認

それでは実装を開始してください。
EOF
)

# Claude Code CLIを実行
echo "🤖 Claude Code CLIを起動..."

# TODO: 正式なClaude Code CLIのコマンドに置き換え
# 現時点では仮のコマンド
if command -v claude-code &> /dev/null; then
    echo "$PROMPT" | claude-code --non-interactive \
        --context requirements/BRD.md \
        --context CLAUDE.md \
        --context profiles/stack_frontend.md
else
    echo "⚠️  Claude Code CLIがインストールされていません"
    echo "⚠️  手動で実装を進めてください"

    # 開発用: デモ実装を作成
    mkdir -p src/components
    cat > src/components/README.md <<DEMO
# Issue #${ISSUE_NUMBER} の実装

このディレクトリにコンポーネントを実装してください。

## 要件
${ISSUE_BODY}

## テスト
- Jest/Vitest: src/__tests__/
- Playwright: tests/e2e/
DEMO

    echo "✅ デモファイルを作成しました"
fi

echo "✅ 実装が完了しました"
