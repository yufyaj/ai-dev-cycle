#!/usr/bin/env python3
"""
Issue を優先度順に取得するスクリプト

優先度:
- P0: 最高優先度（即座に実行）
- P1: 高優先度
- P2: 通常優先度（デフォルト）

同一優先度内では Issue 番号の若い順
"""

import os
import json
import re
from github import Github
from typing import List, Dict, Optional


def extract_priority(issue_body: Optional[str]) -> str:
    """Issue本文から優先度を抽出"""
    if not issue_body:
        return "P2"

    # P0, P1, P2 のパターンを検索
    priority_pattern = r'\b(P[0-2])\b'
    match = re.search(priority_pattern, issue_body)

    if match:
        return match.group(1)

    # 日本語での優先度記載もサポート
    if "最高優先" in issue_body or "緊急" in issue_body:
        return "P0"
    elif "高優先" in issue_body:
        return "P1"

    return "P2"  # デフォルト


def get_issue_status(issue) -> str:
    """Issueの実行可能状態を判定"""
    labels = [label.name for label in issue.labels]

    # 既に実装中または完了済み
    if any(label in labels for label in [
        "ai:implementing",
        "ai:pr-created",
        "ai:completed",
        "done",
        "closed"
    ]):
        return "in_progress"

    # 失敗したIssue（人間の介入が必要）
    if any(label in labels for label in [
        "ai:failed",
        "ai:test-failed",
        "ai:review-failed",
        "ai:security-failed",
        "ai:pr-failed"
    ]):
        return "needs_human_intervention"

    # ブロックされている
    if any(label in labels for label in ["blocked", "waiting", "dependency"]):
        return "blocked"

    # スキップ対象
    if any(label in labels for label in ["wontfix", "duplicate", "skip"]):
        return "skip"

    # 実行可能
    return "ready"


def check_dependencies(issue, all_issues: Dict[int, Dict]) -> bool:
    """依存関係をチェック"""
    # Issue本文から依存関係を抽出
    if not issue.body:
        return True

    # "Depends on #123" や "依存: #123" のパターンを検索
    dependency_pattern = r'(?:Depends on|依存|Requires|Blocks by)[:：]?\s*#(\d+)'
    matches = re.findall(dependency_pattern, issue.body, re.IGNORECASE)

    if not matches:
        return True

    # 依存するIssueが完了しているかチェック
    for dep_issue_num in matches:
        dep_num = int(dep_issue_num)
        if dep_num in all_issues:
            dep_status = all_issues[dep_num]["status"]
            if dep_status not in ["completed", "closed"]:
                return False

    return True


def main():
    """メイン処理"""
    # GitHub API 初期化
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        raise ValueError("GITHUB_TOKEN が設定されていません")

    g = Github(token)
    repo = g.get_repo(os.environ['GITHUB_REPOSITORY'])

    # 強制実行するIssue番号（オプション）
    force_issue = os.environ.get('FORCE_ISSUE')

    # 出力ディレクトリ作成
    os.makedirs('out', exist_ok=True)

    # オープンなIssueを取得
    issues = repo.get_issues(state='open')

    # Issue情報を収集
    issue_list = []
    all_issues_dict = {}

    for issue in issues:
        # Pull Request は除外
        if issue.pull_request:
            continue

        priority = extract_priority(issue.body)
        status = get_issue_status(issue)

        issue_data = {
            "number": issue.number,
            "title": issue.title,
            "priority": priority,
            "status": status,
            "labels": [label.name for label in issue.labels],
            "created_at": issue.created_at.isoformat(),
            "updated_at": issue.updated_at.isoformat()
        }

        issue_list.append(issue_data)
        all_issues_dict[issue.number] = issue_data

    # 依存関係チェック
    for issue_data in issue_list:
        if issue_data["status"] == "ready":
            issue = repo.get_issue(issue_data["number"])
            if not check_dependencies(issue, all_issues_dict):
                issue_data["status"] = "blocked_by_dependency"

    # 優先度順にソート（P0 > P1 > P2、同一優先度内ではIssue番号昇順）
    priority_order = {"P0": 0, "P1": 1, "P2": 2}
    issue_list.sort(key=lambda x: (
        priority_order.get(x["priority"], 2),
        x["number"]
    ))

    # 強制実行指定がある場合は最優先に
    if force_issue:
        force_num = int(force_issue)
        for i, issue_data in enumerate(issue_list):
            if issue_data["number"] == force_num:
                # リストの先頭に移動
                issue_list.insert(0, issue_list.pop(i))
                issue_data["status"] = "ready"  # 強制的に実行可能にする
                break

    # 結果を保存
    with open('out/prioritized_issues.json', 'w', encoding='utf-8') as f:
        json.dump(issue_list, f, ensure_ascii=False, indent=2)

    # サマリー出力
    ready_count = sum(1 for i in issue_list if i["status"] == "ready")
    in_progress_count = sum(1 for i in issue_list if i["status"] == "in_progress")
    blocked_count = sum(1 for i in issue_list if i["status"] in ["blocked", "blocked_by_dependency"])
    needs_human_count = sum(1 for i in issue_list if i["status"] == "needs_human_intervention")

    print(f"📊 Issue サマリー:")
    print(f"  - 実行可能: {ready_count}")
    print(f"  - 実行中/完了: {in_progress_count}")
    print(f"  - ブロック中: {blocked_count}")
    print(f"  - 要人間介入: {needs_human_count}")
    print(f"  - 合計: {len(issue_list)}")

    if ready_count > 0:
        next_issue = next(i for i in issue_list if i["status"] == "ready")
        print(f"\n🎯 次の実行対象: Issue #{next_issue['number']} ({next_issue['priority']})")
        print(f"   タイトル: {next_issue['title']}")


if __name__ == '__main__':
    main()