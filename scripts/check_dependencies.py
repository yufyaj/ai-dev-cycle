#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Issue の依存関係をチェックする

使い方:
  python3 check_dependencies.py <issue_number>

出力:
  - 依存先が全て解決済み: exit 0
  - 依存先に未解決がある: exit 1
"""
import os
import re
import sys
from github import Github

def check_dependencies(issue_number):
    """
    Issueの依存関係をチェックする

    Args:
        issue_number: チェック対象のIssue番号

    Returns:
        True: 依存関係が全て解決済み
        False: 未解決の依存関係がある
    """
    g = Github(os.environ['GITHUB_TOKEN'])
    repo = g.get_repo(os.environ['GITHUB_REPOSITORY'])

    issue = repo.get_issue(issue_number)

    # Issue本文から "Depends on #XX" を抽出
    depends_on_pattern = r'(?:Depends on|依存:?)\s*#(\d+)'
    matches = re.findall(depends_on_pattern, issue.body or '', re.IGNORECASE)

    if not matches:
        print(f"✅ Issue #{issue_number} には依存関係がありません")
        return True

    depends_on_issues = [int(m) for m in matches]
    print(f"📋 Issue #{issue_number} の依存先: {depends_on_issues}")

    # 各依存先のステータスをチェック
    unresolved = []
    for dep_issue_number in depends_on_issues:
        try:
            dep_issue = repo.get_issue(dep_issue_number)
            if dep_issue.state == 'open':
                unresolved.append(dep_issue_number)
                print(f"  ⏸️  Issue #{dep_issue_number} は未解決（open）")
            else:
                print(f"  ✅ Issue #{dep_issue_number} は解決済み（closed）")
        except Exception as e:
            print(f"  ⚠️  Issue #{dep_issue_number} が見つかりません: {e}")
            unresolved.append(dep_issue_number)

    if unresolved:
        print(f"\n❌ 未解決の依存関係があります: {unresolved}")
        return False
    else:
        print(f"\n✅ 全ての依存関係が解決されています")
        return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 check_dependencies.py <issue_number>")
        sys.exit(1)

    issue_number = int(sys.argv[1])

    if check_dependencies(issue_number):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()
