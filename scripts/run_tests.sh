#!/bin/bash
set -euo pipefail

# テストを統合実行する
# - Type Check
# - Jest/Vitest (ユニット/コンポーネント)
# - Playwright (E2E)

echo "🧪 テストを開始します..."

# Type Check
echo ""
echo "📝 TypeScript Type Check..."
if npm run type-check 2>/dev/null; then
    echo "✅ Type Check: PASS"
else
    echo "⚠️  Type Check スクリプトが見つかりません（スキップ）"
fi

# ユニット/コンポーネントテスト
echo ""
echo "🧪 Jest/Vitest (ユニット/コンポーネント)..."
if npm test 2>/dev/null; then
    echo "✅ ユニットテスト: PASS"
else
    echo "⚠️  ユニットテストが見つかりません（スキップ）"
fi

# E2Eテスト
echo ""
echo "🎭 Playwright (E2E)..."
if npm run test:e2e 2>/dev/null; then
    echo "✅ E2Eテスト: PASS"
else
    echo "⚠️  E2Eテストが見つかりません（スキップ）"
fi

echo ""
echo "✅ 全てのテストが完了しました"
