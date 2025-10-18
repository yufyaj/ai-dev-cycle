#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
次に実行すべきIssueを取得する

優先度順（P0 → P1 → P2）にソートし、依存関係をチェックして
実行可能なIssueを返す。

使い方:
  export GITHUB_TOKEN=xxx
  export GITHUB_REPOSITORY=owner/repo
  python3 get_next_issue.py

出力:
  - out/next_issue.json に次のIssueの情報を出力
  - 実行可能なIssueがない場合はファイルを作成しない
"""
import os
import re
import json
import subprocess
from github import Github

PRIORITY_ORDER = {'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3}

def extract_priority(issue):
    """
    Issueのラベルから優先度を抽出

    Args:
        issue: GitHub Issue オブジェクト

    Returns:
        優先度（P0, P1, P2, P3, または None）
    """
    for label in issue.labels:
        if label.name.upper().startswith('P'):
            return label.name.upper()[:2]  # P0, P1, P2
    return 'P9'  # 優先度なし = 最低優先度

def check_dependencies(issue_number):
    """
    依存関係をチェック

    Args:
        issue_number: Issue番号

    Returns:
        True: 依存関係が全て解決済み
        False: 未解決の依存関係がある
    """
    try:
        result = subprocess.run(
            ['python3', 'scripts/check_dependencies.py', str(issue_number)],
            capture_output=True,
            text=True,
            check=False
        )
        return result.returncode == 0
    except Exception as e:
        print(f"⚠️  依存関係チェックでエラー: {e}")
        return False

def get_next_issue():
    """
    次に実行すべきIssueを取得

    Returns:
        Issue番号 または None
    """
    g = Github(os.environ['GITHUB_TOKEN'])
    repo = g.get_repo(os.environ['GITHUB_REPOSITORY'])

    # 強制実行が指定されている場合
    force_issue = os.environ.get('FORCE_ISSUE')
    if force_issue:
        issue_number = int(force_issue)
        issue = repo.get_issue(issue_number)
        if issue.state == 'open':
            print(f"🎯 強制実行: Issue #{issue_number}")
            return {
                'issue_number': issue_number,
                'title': issue.title,
                'priority': extract_priority(issue)
            }
        else:
            print(f"⚠️  Issue #{issue_number} は既にクローズされています")
            return None

    # ai:ready ラベルが付いたopenなIssueを取得
    issues = repo.get_issues(
        state='open',
        labels=['ai:ready']
    )

    # 優先度順にソート
    sorted_issues = sorted(
        issues,
        key=lambda x: (PRIORITY_ORDER.get(extract_priority(x), 99), x.number)
    )

    print(f"📋 ai:ready ラベルのIssue: {len(list(sorted_issues))}件")

    # 依存関係をチェックして実行可能なIssueを探す
    for issue in sorted_issues:
        priority = extract_priority(issue)
        print(f"\n🔍 チェック中: Issue #{issue.number} [{priority}] {issue.title}")

        if check_dependencies(issue.number):
            print(f"✅ Issue #{issue.number} は実行可能です")
            return {
                'issue_number': issue.number,
                'title': issue.title,
                'priority': priority
            }
        else:
            print(f"⏸️  Issue #{issue.number} は依存関係待ちです")

    print("\n⏸️  実行可能なIssueがありません")
    return None

def main():
    # outディレクトリを作成
    os.makedirs('out', exist_ok=True)

    next_issue = get_next_issue()

    if next_issue:
        # JSONファイルに出力
        with open('out/next_issue.json', 'w', encoding='utf-8') as f:
            json.dump(next_issue, f, ensure_ascii=False, indent=2)

        print(f"\n🚀 次の実行Issue: #{next_issue['issue_number']} [{next_issue['priority']}] {next_issue['title']}")
    else:
        # 実行可能なIssueがない場合はファイルを作成しない
        if os.path.exists('out/next_issue.json'):
            os.remove('out/next_issue.json')
        print("\n⏸️  実行可能なIssueがないため、待機します")

if __name__ == '__main__':
    main()
