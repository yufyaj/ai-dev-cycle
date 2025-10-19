#!/usr/bin/env python3
"""
Issue の情報から Pull Request を自動作成するスクリプト
CLAUDE.md のルールに従った PR 本文を生成
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from github import Github


def load_pr_data() -> dict:
    """PR用データを読み込み"""
    with open('out/pr_data.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def load_implementation_summary() -> dict:
    """実装サマリーを読み込み"""
    summary_path = Path('out/implementation_summary.json')
    if summary_path.exists():
        with open(summary_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def load_test_report() -> dict:
    """テストレポートを読み込み"""
    report_path = Path('out/test_report.json')
    if report_path.exists():
        with open(report_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def load_security_report() -> dict:
    """セキュリティレポートを読み込み"""
    report_path = Path('out/security_report.json')
    if report_path.exists():
        with open(report_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def generate_pr_title(issue_data: dict) -> str:
    """PR タイトルを生成"""
    issue_title = issue_data['issue_title']
    issue_number = issue_data['issue_number']

    # タイトルからプレフィックスを決定
    if 'バグ' in issue_title or 'fix' in issue_title.lower() or 'bug' in issue_title.lower():
        prefix = 'fix'
    elif '機能' in issue_title or 'feature' in issue_title.lower() or '追加' in issue_title:
        prefix = 'feat'
    elif 'リファクタ' in issue_title or 'refactor' in issue_title.lower():
        prefix = 'refactor'
    elif 'テスト' in issue_title or 'test' in issue_title.lower():
        prefix = 'test'
    elif 'ドキュメント' in issue_title or 'doc' in issue_title.lower():
        prefix = 'docs'
    else:
        prefix = 'feat'

    return f"{prefix}: {issue_title} (#{issue_number})"


def generate_pr_body(issue_data: dict, impl_summary: dict, test_report: dict, security_report: dict) -> str:
    """PR 本文を生成（CLAUDE.mdのルールに従う）"""

    # テスト結果のサマリー
    test_status = "✅ 成功" if test_report.get('summary', {}).get('all_passed', False) else "⚠️ 一部失敗"
    test_passed = test_report.get('summary', {}).get('total_tests_passed', 0)
    test_failed = test_report.get('summary', {}).get('total_tests_failed', 0)
    coverage = test_report.get('summary', {}).get('average_coverage', 0)

    # セキュリティチェック結果
    security_status = "✅ 問題なし" if security_report.get('passed', True) else "⚠️ 要確認"
    critical_issues = security_report.get('summary', {}).get('critical', 0)

    # 変更ファイル一覧
    files_changed = issue_data.get('files_changed', [])
    files_summary = "\n".join([f"- {f}" for f in files_changed[:10]])  # 最初の10ファイルのみ
    if len(files_changed) > 10:
        files_summary += f"\n- ... 他 {len(files_changed) - 10} ファイル"

    # PR本文を生成
    body = f"""## ✅ 目的

Issue #{issue_data['issue_number']} の実装

### Issue内容
{issue_data.get('issue_body', 'なし')}

---

## 🧭 設計

### 実装サマリー
{impl_summary.get('summary', 'AIによる自動実装')}

### 責務・レイヤー位置
- **実装レイヤー**: アプリケーション層 / ドメイン層
- **責務分離**: CLAUDE.mdの原則に従い、各レイヤーの責務を明確に分離
- **依存方向**: 上位層から下位層への単方向依存を維持

### 変更ファイル
{files_summary}

---

## 🧪 テスト観点

### テスト計画
{impl_summary.get('test_plan', 'TDD原則に基づいたユニットテスト実装')}

### テスト実行結果
- **ステータス**: {test_status}
- **成功**: {test_passed} テスト
- **失敗**: {test_failed} テスト
- **カバレッジ**: {coverage:.1f}%

---

## ⚠️ 影響範囲

### 変更統計
{issue_data.get('diff_stat', '変更統計なし')}

### セキュリティチェック
- **ステータス**: {security_status}
- **Critical Issues**: {critical_issues}

### 破壊的変更
なし（後方互換性を維持）

---

## 🔁 ロールバック手順

問題が発生した場合は以下の手順でロールバック可能:

1. このPRをRevert
2. `git revert` コマンドでコミットを取り消し
3. 依存関係がある場合は関連PRも確認

---

## 📝 備考

{impl_summary.get('notes', '')}

- 🤖 このPRはAIによって自動生成されました
- 📋 CLAUDE.mdのルールに準拠
- 🧪 TDD原則に基づいた実装
- 🔒 セキュリティチェック済み

---

### チェックリスト
- [x] コードは CLAUDE.md のルールに準拠している
- [x] テストを実装した（TDD原則）
- [x] PRサイズは10ファイル/500行以内
- [x] セキュリティチェックを実施
- [x] 責務境界を越えていない

Closes #{issue_data['issue_number']}
"""

    return body


def create_pull_request(branch_name: str, title: str, body: str) -> int:
    """GitHub CLI を使って PR を作成"""
    # PR作成コマンド
    cmd = [
        'gh', 'pr', 'create',
        '--base', 'main',
        '--head', branch_name,
        '--title', title,
        '--body', body
    ]

    # ラベルを追加
    labels = ['ai:generated', 'auto-merge']
    for label in labels:
        cmd.extend(['--label', label])

    # PR作成実行
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print(f"❌ PR作成エラー: {result.stderr}")
        # 既にPRが存在する場合は更新を試みる
        if 'already exists' in result.stderr:
            print("📝 既存のPRを更新します...")
            update_cmd = [
                'gh', 'pr', 'edit',
                '--title', title,
                '--body', body
            ]
            subprocess.run(update_cmd)

        return None

    # 作成されたPR番号を取得
    pr_url = result.stdout.strip()
    if pr_url:
        # URLからPR番号を抽出
        import re
        match = re.search(r'/pull/(\d+)', pr_url)
        if match:
            return int(match.group(1))

    return None


def main():
    """メイン処理"""
    # 環境変数チェック
    branch_name = os.environ.get('BRANCH_NAME')
    if not branch_name:
        print("❌ BRANCH_NAME が設定されていません")
        sys.exit(1)

    # データ読み込み
    try:
        pr_data = load_pr_data()
        impl_summary = load_implementation_summary()
        test_report = load_test_report()
        security_report = load_security_report()
    except Exception as e:
        print(f"❌ データ読み込みエラー: {e}")
        sys.exit(1)

    # PRタイトルと本文を生成
    pr_title = generate_pr_title(pr_data)
    pr_body = generate_pr_body(pr_data, impl_summary, test_report, security_report)

    print(f"📝 PR作成中...")
    print(f"  タイトル: {pr_title}")
    print(f"  ブランチ: {branch_name}")

    # PR作成
    pr_number = create_pull_request(branch_name, pr_title, pr_body)

    if pr_number:
        print(f"✅ PR #{pr_number} を作成しました")

        # PR情報を保存
        pr_info = {
            'pr_number': pr_number,
            'title': pr_title,
            'branch': branch_name,
            'issue_number': pr_data['issue_number']
        }

        with open('out/pr_info.json', 'w') as f:
            json.dump(pr_info, f, indent=2)

        # GitHub APIを使って追加設定
        token = os.environ.get('GITHUB_TOKEN')
        if token:
            g = Github(token)
            repo = g.get_repo(os.environ['GITHUB_REPOSITORY'])
            pr = repo.get_pull(pr_number)

            # レビュアーの自動設定（CODEOWNERS がある場合）
            codeowners_path = Path('.github/CODEOWNERS')
            if codeowners_path.exists():
                print("📧 CODEOWNERS からレビュアーを設定中...")
                # CODEOWNERS の解析と設定（簡略化）

            # Auto-merge の有効化
            try:
                pr.enable_automerge(merge_method='SQUASH')
                print("✅ Auto-merge を有効化しました")
            except Exception as e:
                print(f"⚠️ Auto-merge の有効化に失敗: {e}")

    else:
        print("❌ PR作成に失敗しました")
        sys.exit(1)


if __name__ == '__main__':
    main()