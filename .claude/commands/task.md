---
allowed-tools: Read(*.md), Write, Bash, Fetch(*)
description: "requirements/BRD.mdをベースにIssueを作成する。"
---

# /task
`requirements/BRD.md` をもとに、以下のルールで **実装タスクを自動生成**してください。

## 目的
BRD（Business Requirements Document）に記載された各機能（H2）をもとに、  
1機能 = 1Issue 単位で実装タスクを作成し、開発のクリティカルパス順に並べます。


## 手順

1. **入力**  
   - `requirements/BRD.md` の本文を解析
   - 各 H2（機能）タイトルとその配下の Acceptance Criteria を抽出
   - 非機能要件・KPI も別途必要に応じてタスク化

2. **タスク化の方針**  
   - 各 H2 → 1つの Issue
   - 1 Issue = 1機能（粒度は小さく）
   - Acceptance Criteria はそのまま Issue の Done 定義とする
   - 依存関係がある場合は `Depends on #<Issue番号>` のように追記する

3. **優先度の決定**  
   - クリティカルパスに基づいて P0 > P1 > P2 … の優先度を付与
   - 依存関係のあるタスクは前工程を上位に置く

4. **出力形式**（GitHub Issue 複数件）
   - `out/issues.plan.json` を作成してください。
   - 形式（例）：
    ```json
    {
      "project": "my-repo",
      "items": [
        {
          "key": "T01",
          "title": "feat: ユーザー認証機能の実装",
          "summary": "ログイン/登録APIを実装する",
          "acceptance": [
            "Given 登録済みユーザーが…",
            "When POST /auth/login…",
            "Then 200 OK と JWT…"
          ],
          "priority": "P0",
          "labels": ["feature","backend","ai:task"],
          "depends_on": []
        },
        {
          "key": "T02",
          "title": "feat: 入金登録機能の実装",
          "summary": "入金データ登録APIを実装する",
          "acceptance": ["Given …","When …","Then …"],
          "priority": "P1",
          "labels": ["feature","backend","ai:task"],
          "depends_on": ["T01"]
        }
      ]
    }
    ```

5. **次のコマンドを実行して DRY-RUN：**
   `python3 scripts/create_issues.py --repo <owner>/<repo> --dry-run`

6. **問題なければ本実行：**
   `python3 scripts/create_issues.py --repo <owner>/<repo>`


## 追加ルール
- タスクのタイトルは `feat: 機能名` 形式にする（自動PR連携しやすくするため）
- 非機能要件（SLO/セキュリティ/監視など）も必要に応じて P1/P2 でタスク化
- 曖昧な要件があれば、Issueとして `clarify:` で切る
- タスク順は **上から順に実装順序になるよう** 並べる

## 出力時の注意
- 1タスク = 1Issue 形式
- 自動でGitHub Issueに登録してください
- Acceptance Criteria は削らず保持
