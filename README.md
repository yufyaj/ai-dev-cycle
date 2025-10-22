# AI-Driven Dev Cycle — 使い方（Claude + GitHub Actions）

このリポジトリは、要件定義から実装・検証・PR作成・自動マージ・次タスク起動までを自動化する最小実装です。複数言語・スタック（Node/Python/Gradle(Kotlin)/Go/Rust、Playwright）のテストを自動実行し、PRサイズ制限・静的解析（CodeQL）を通過したものだけが次の工程へ進みます。

---

## 準備

- Secrets（必須）
  - `CLAUDE_CODE_OAUTH_TOKEN`: Claude Code Action 用の OAuth トークン
- Actions 権限
  - Repo Settings → Actions → General → Workflow permissions →「Read and write permissions」
- 推奨ラベル（なければ作成）
  - `P0`, `P1`, `P2`, `ai:task`, `automerge`, `brd:request`, `brd:ready`
- 既定のトークン
  - ワークフロー内で `GITHUB_TOKEN` / `GH_TOKEN` を利用（デフォルトで注入）

---

## ワークフロー一覧

- 01 Plan Issues（`01-plan-issues.yml`）
  - 役割: BRD を解析し `out/issues.plan.json` を生成 → GitHub Issues を一括作成
  - Issue には優先度ラベル（`P0`等）とクリティカルパス順序（`cp:n`）を自動付与
- 05 Auto Complete Pipeline（`05-auto-complete-pipeline.yml`）
  - 役割: 実装→テスト（マルチランタイム＋Playwright）→レビュー→セキュリティ→PR 作成
  - 失敗時は自己リトライ（self-dispatch）。`max_retry_count` と `retry_count` で動的に制御
- 03 PR CI + Security（`03-pr-ci-security.yml`）
  - 役割: PRでテスト実行（`scripts/run_all_tests.py`）と PR サイズ検査（10ファイル/500行、`scripts/check_pr_size.py`）
- 04 Auto Merge And Next（`04-auto-merge-and-next.yml`）
  - 役割: `automerge` ラベルのPRを自動（squash）マージ（次タスク起動は手動で05を実行）
- CodeQL（`codeql.yml`）
  - 役割: JavaScript/Python/Java/Kotlin/Go の静的解析を PR とスケジュールで実施

---

## 典型フロー（おすすめ）

1) 要件定義（ローカル対話）
- docs/requirements/BRD_GUIDE.md を参照しつつ、Claude Code と対話で要件を固める
- docs/requirements/BRD_TEMPLATE.md をベースに `docs/requirements/BRD.md` を作成
- 必要なら `python3 scripts/validate_brd.py --json` で形式チェック

2) タスク化（Issue作成）
- Actions から「01 Plan Issues」を実行
- BRD → `out/issues.plan.json` → GitHub Issues作成（`P0/P1`、`cp:n`付与）

3) 自動実装の起動
- Actions から「05 Auto Complete Pipeline」を実行（`issue_number` を指定）
- 失敗時は自己リトライで継続（上限は `max_retry_count`）

4) PR検証・自動マージ
- PR作成後、「03 PR CI + Security」がテスト＆PRサイズチェックを実行
- 自動マージしたいPRに `automerge` ラベルを付与 → 「04 Auto Merge And Next」で自動マージ→次タスク起動

---

## CLI から手動実行（`gh`）

- タスク化
  - `gh workflow run 01-plan-issues.yml`
- 自動実装パイプラインを起動（Issue指定）
  - `gh workflow run 05-auto-complete-pipeline.yml --field issue_number=37 --field max_retry_count=5`
  - 続きから再開する場合: `--field retry_count=<前回値>` と `--field feedback='...'` を指定

---

## スクリプト（ローカルでの補助）

- `scripts/run_all_tests.py`
  - Node/Python/Gradle(Kotlin)/Go/Rust のユニットテストと Playwright（存在時）を実行
  - 使い方: `python3 scripts/run_all_tests.py`
- `scripts/create_issues.py`
  - `out/issues.plan.json` から GitHub Issues を作成（優先度ラベルと `cp:n` 付与）
  - 使い方（DRY-RUN）: `python3 scripts/create_issues.py --repo <owner/repo> --dry-run`
  - 本実行: `python3 scripts/create_issues.py --repo <owner/repo>`
- `scripts/validate_brd.py`
  - BRDの体裁検査（H1/H2/Acceptance Criteria 等）
  - 使い方: `python3 scripts/validate_brd.py --json`
- `scripts/check_pr_size.py`
  - PRサイズ（10ファイル/500行以内）検査
  - 使い方: `export PR_NUMBER=<番号>; python3 scripts/check_pr_size.py`

---

## テスト／Playwright

- Playwright はワークフロー内で自動インストール（`npx playwright install --with-deps`）
- ローカルでE2Eを走らせる場合
  - 依存インストール: `npm i` → `npx playwright install`
  - 実行: `npx playwright test`

---

## トラブルシュート

- Claude が動かない
  - `CLAUDE_CODE_OAUTH_TOKEN` が未設定の可能性。Repo Secretsを確認
- `gh` CLI がエラー
  - ローカルで実行時は `gh auth login` を実施。Actions内では `GITHUB_TOKEN`/`GH_TOKEN` を使用
- 依存未解決で実行されない
  - Issue本文に `Depends on #<番号>`（または「依存タスク: #<番号>」）を正しく記載
- PRが自動マージされない
  - `automerge` ラベル付与が必要。PRに付与して再試行

---

## ポリシー／制約

- PRサイズは 10ファイル / 500行以内（分割推奨）
- TDD 原則（PRにテストを含める）
- Secrets のコミット禁止（検出時は再実装）
- ビジネスロジックはサーバー側へ（BFF/UIに置かない）

---

## 参考

- 主なワークフロー: `.github/workflows/*.yml`
- BRD: `docs/requirements/BRD.md`
- 生成計画: `out/issues.plan.json`（01で生成）
- テスト結果: `out/test_report.json`（自動実装/PR CI）
