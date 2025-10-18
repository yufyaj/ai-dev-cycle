#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PRのサイズをチェックする

CLAUDE.mdの原則: 10ファイル/500行以内

使い方:
  export GITHUB_TOKEN=xxx
  export PR_NUMBER=123
  python3 check_pr_size.py

出力:
  - サイズが適切: exit 0
  - サイズが大きすぎる: exit 1
"""
import os
import sys
import subprocess

MAX_FILES = 10
MAX_LINES = 500

def check_pr_size():
    """
    PRのファイル数と行数をチェック

    Returns:
        True: サイズが適切
        False: サイズが大きすぎる
    """
    pr_number = os.environ['PR_NUMBER']

    # gh コマンドでPRの変更を取得
    result = subprocess.run(
        ['gh', 'pr', 'diff', pr_number, '--stat'],
        capture_output=True,
        text=True,
        check=True
    )

    diff_stat = result.stdout

    # ファイル数と行数を集計
    changed_files = []
    total_additions = 0
    total_deletions = 0

    for line in diff_stat.split('\n'):
        if '|' in line:
            parts = line.split('|')
            if len(parts) >= 2:
                file_path = parts[0].strip()
                stats = parts[1].strip()

                # 行数を抽出
                if '+' in stats or '-' in stats:
                    additions = stats.count('+')
                    deletions = stats.count('-')
                    total_additions += additions
                    total_deletions += deletions
                    changed_files.append(file_path)

    num_files = len(changed_files)
    total_lines = total_additions + total_deletions

    print(f"📊 PRサイズチェック")
    print(f"  - ファイル数: {num_files} / {MAX_FILES}")
    print(f"  - 変更行数: {total_lines} ({total_additions}+ / {total_deletions}-) / {MAX_LINES}")

    # チェック
    is_valid = True

    if num_files > MAX_FILES:
        print(f"\n❌ ファイル数が多すぎます: {num_files} > {MAX_FILES}")
        is_valid = False

    if total_lines > MAX_LINES:
        print(f"\n❌ 変更行数が多すぎます: {total_lines} > {MAX_LINES}")
        is_valid = False

    if is_valid:
        print(f"\n✅ PRサイズは適切です")
        return True
    else:
        print(f"\n❌ PRを複数に分割してください")
        print(f"\n【CLAUDE.mdの原則】")
        print(f"  - 1PR = 1機能")
        print(f"  - PRサイズ: {MAX_FILES}ファイル / {MAX_LINES}行以内")
        return False

def main():
    if check_pr_size():
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()
