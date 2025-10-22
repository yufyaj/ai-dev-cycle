#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
未着手の実装Issueの中から、依存関係が解決済みで最優先のものを1件選ぶ。

優先度はラベル P0 > P1 > P2 ... の順。
候補はラベル "ai:task" が付与され、Open のIssue。
本文中の Depends on #<n>（英日）を満たしている必要がある。

出力:
  - 見つかった場合: stdoutにIssue番号を出力、exit 0
  - 見つからない: exit 1
"""
import os
import re
import sys
from github import Github


PRIORITIES = [f"P{i}" for i in range(0, 10)]


def deps_resolved(repo, issue) -> bool:
    body = issue.body or ''
    pattern = r'(?:Depends on|依存:?|依存タスク)\s*#(\d+)'
    nums = re.findall(pattern, body, flags=re.IGNORECASE)
    if not nums:
        return True
    for n in map(int, nums):
        try:
            dep = repo.get_issue(number=n)
        except Exception:
            return False
        if dep.state != 'closed':
            return False
    return True


def main() -> int:
    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    repo_full = os.environ['GITHUB_REPOSITORY']
    if not token:
        print('GITHUB_TOKEN (or GH_TOKEN) is required', file=sys.stderr)
        return 2
    gh = Github(token)
    repo = gh.get_repo(repo_full)

    # ラベル ai:task かつ open
    qs = repo.get_issues(state='open', labels=[repo.get_label('ai:task')])
    candidates = list(qs)
    if not candidates:
        print('no open ai:task issues', file=sys.stderr)
        return 1

    # 優先度別に並び替え（P0, P1 ... の順）
    def prio(issue):
        labels = [l.name for l in issue.labels]
        for i, p in enumerate(PRIORITIES):
            if p in labels:
                return i
        return 999

    candidates.sort(key=lambda i: (prio(i), i.number))

    for iss in candidates:
        if deps_resolved(repo, iss):
            print(iss.number)
            return 0

    print('no issue with resolved dependencies', file=sys.stderr)
    return 1


if __name__ == '__main__':
    raise SystemExit(main())

