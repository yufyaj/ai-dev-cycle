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
