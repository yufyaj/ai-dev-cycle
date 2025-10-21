# AI-Driven Dev Cycle (Claude + GitHub Actions)

このリポジトリは、要件（BRD）からタスクを自動生成し、クリティカルパス順に、
Claude（Max）とGitHub Actionsで「実装→テスト→セキュリティ→PR→自動マージ→次タスク」を
反復する開発サイクルの最小実装です。

## フロー概要
1. `requirements/BRD.md` に要件を書く（H2見出しごとに機能）
2. `01-plan-issues.yml` がタスク化して Issue を作成、`cp:n` ラベル付与
3. `02-orchestrate-next.yml` が未着手の最小 `cp:n` を選んで @claude に実装依頼
4. `03-pr-ci-security.yml` が Lint/UnitTest/CodeQL を実行。失敗時は @claude に修復依頼
5. 合格すると `04-auto-merge-and-next.yml` が自動マージ→次の Issue を起動

## セットアップ最短
- Claude（Max）にログインして、このリポジトリへ GitHub App をインストール
- `Actions` で「01 Plan Issues」を実行 → 「02 Orchestrate Next」を実行

## ワークフロー使用方法

### 自動Issue実装の起動方法
特定のIssueを実装したい場合、以下のコマンドでワークフローを起動できます：

```bash
# Issue #123を実装
gh workflow run auto-complete-pipeline.yml --field issue_number=123
```

### retry機能の使用方法
実行が失敗した場合や途中から再開したい場合、retry機能を使用できます：

```bash
# retry_count=2から再開
gh workflow run auto-complete-pipeline.yml \
  --field issue_number=123 \
  --field retry_count=2 \
  --field feedback="前回の実行で見つかった問題の説明"
```

### パラメータの説明
- `issue_number`: 実装対象のIssue番号（必須）
- `retry_count`: 再試行カウント（デフォルト: 0）
- `max_retry_count`: 最大再試行回数（デフォルト: 3）
- `feedback`: 前回実行時の問題やフィードバック（オプション）

### 実行例
```bash
# 新規実装
gh workflow run auto-complete-pipeline.yml --field issue_number=44

# 失敗時の再実行（フィードバック付き）
gh workflow run auto-complete-pipeline.yml \
  --field issue_number=44 \
  --field retry_count=1 \
  --field feedback="Lint エラーが発生しました。import文の順序を修正してください"
```

## memo
ワークフローの権限付与
gh api --method PUT repos/yufyaj/ai-dev-cycle/actions/permissions/workflow -f default_workflow_permissions=write