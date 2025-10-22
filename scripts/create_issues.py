#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
out/issues.plan.json を読み、GitHub Issues を作成する。
- gh CLI を使用（事前に gh auth login 済みであること）
- 2パス方式で依存関係(Depends on)を解決
- 生成結果を out/issues.created.json に書き出す

使い方:
  python3 scripts/create_issues.py --repo <owner/repo> [--dry-run]
"""
import json
import subprocess
import argparse
from pathlib import Path
from textwrap import indent

PLAN_PATH = Path("out/issues.plan.json")
OUT_PATH = Path("out/issues.created.json")

def run(cmd):
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"cmd failed: {' '.join(cmd)}\n{res.stderr}")
    return res.stdout.strip()

def run_soft(cmd):
    """非ゼロでも例外にせず標準出力を返す（ラベル作成など冪等操作向け）"""
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.returncode, res.stdout.strip(), res.stderr.strip()

def ensure_labels(repo: str, items: list[dict]):
    """必要なラベルを事前に作成（存在すればスキップ）"""
    need: set[str] = set()
    # 既定の色（任意）
    color_map = {
        'feature': 'a2eeef',
        'backend': '5319e7',
        'frontend': '1d76db',
        'ai:task': 'ededed',
        'bug': 'd73a4a',
        'P0': 'd73a4a',
        'P1': 'fbca04',
        'P2': 'c5def5',
    }
    # itemsから収集
    for it in items:
        for l in it.get('labels', []) or []:
            need.add(l)
        if it.get('priority'):
            need.add(it['priority'])
    # cp:n ラベル（連番）
    for idx, _ in enumerate(items, start=1):
        need.add(f"cp:{idx}")

    # 既存ラベル一覧を取得
    code, out, err = run_soft(["gh", "label", "list", "--repo", repo, "--json", "name", "--jq", ".[].name"])
    existing = set(out.splitlines()) if code == 0 else set()

    for name in sorted(need):
        if name in existing:
            continue
        color = color_map.get(name, 'ededed')
        desc = f"auto-created label: {name}"
        # 作成を試行。既存なら失敗するが無視
        rc, so, se = run_soft(["gh", "label", "create", name, "--repo", repo, "--color", color, "-d", desc])
        # 失敗しても続行（権限不足など）
        if rc != 0:
            print(f"WARN: failed to create label '{name}': {se}")

def build_body(item):
    lines = []
    if item.get("summary"):
        lines.append(f"**概要**\n- {item['summary']}")
    if item.get("acceptance"):
        lines.append("**完了条件（Acceptance Criteria）**")
        lines.extend([f"- {a}" for a in item["acceptance"]])
    if item.get("priority"):
        lines.append(f"**優先度**: {item['priority']}")
    if item.get("depends_on"):
        # 1パス目では key をそのまま書く（後で置換）
        dep_keys = ", ".join(item["depends_on"])
        lines.append(f"**依存タスク（key）**: {dep_keys}")
    return "\n".join(lines)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True, help="owner/repo 形式")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not PLAN_PATH.exists():
        raise SystemExit(f"{PLAN_PATH} not found")

    plan = json.loads(PLAN_PATH.read_text(encoding="utf-8"))
    items = plan.get("items") or []
    if not items:
        raise SystemExit("no items in plan")

    created = {"repo": args.repo, "map": {}}  # key -> issue_number

    # 必要なラベルを事前に作成
    ensure_labels(args.repo, items)

    # 1st pass: Issueを作成
    for it in items:
        key = it["key"]
        title = it["title"]
        labels = it.get("labels", [])
        # 優先度をラベルとして付与（例: P0/P1/...）
        if it.get("priority"):
            labels = labels + [it["priority"]]
        # クリティカルパス順序のラベル（cp:n）を付与（itemsの並び順をそのまま採用）
        # インデックスは1始まりの連番
        try:
            idx = items.index(it) + 1
            labels.append(f"cp:{idx}")
        except Exception:
            pass
        body = build_body(it)

        if args.dry_run:
            print(f"[DRY-RUN] create: {key}: {title}")
            continue

        cmd = [
            "gh", "issue", "create",
            "--repo", args.repo,
            "--title", title,
            "--body", body
        ]
        if labels:
            cmd += ["--label", ",".join(labels)]

        out = run(cmd)  # returns URL like https://github.com/owner/repo/issues/123
        try:
            # URLの末尾からIssue番号を抽出
            issue_number = int(out.rstrip('/').split('/')[-1])
        except Exception as e:
            raise RuntimeError(f"failed to parse issue number from URL: {out}\nError: {e}")

        created["map"][key] = issue_number
        print(f"created: {key} -> #{issue_number} {title}")

    if args.dry_run:
        print("[DRY-RUN] skip dependency patch")
        return

    # 2nd pass: 依存関係を Issue番号 に置換して本文を追記
    for it in items:
        key = it["key"]
        depends = it.get("depends_on") or []
        if not depends:
            continue
        # 置換テキスト作成
        dep_nums = [f"#{created['map'][d]}" for d in depends if d in created["map"]]
        if not dep_nums:
            continue
        dep_line = f"\n\n**依存タスク**: " + ", ".join(dep_nums) + "\n"
        issue_number = created["map"][key]
        # 既存本文を取得
        body_json = run(["gh", "api", f"repos/{args.repo}/issues/{issue_number}", "--jq", ".body"])
        new_body = body_json + dep_line
        # 更新
        run(["gh", "api", f"repos/{args.repo}/issues/{issue_number}", "-X", "PATCH", "-F", f"body={new_body}"])
        print(f"patched depends_on for #{issue_number}: {', '.join(dep_nums)}")

    # 保存
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(created, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"written: {OUT_PATH}")

if __name__ == "__main__":
    main()
