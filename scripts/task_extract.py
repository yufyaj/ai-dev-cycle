#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BRD( requirements/BRD.md )の H2 見出し(## XXX)を 1タスクとして抽出し、
tasks.yaml を生成します。
- 依存(deps)や見積(estimate_h)は初期値を入れておくので、後から編集OK
"""
import re
import sys
import yaml
from pathlib import Path

BRD_PATH = Path("requirements/BRD.md")
OUT_PATH = Path("tasks.yaml")

def main() -> int:
    if not BRD_PATH.exists():
        print("requirements/BRD.md not found", file=sys.stderr)
        return 1

    text = BRD_PATH.read_text(encoding="utf-8")

    # H2 見出しを抽出（例: ## ヘルスチェックAPI）
    headings = re.findall(r"^##\s+(.+)$", text, flags=re.M)
    if not headings:
        print("No H2 headings (## ...) found in requirements/BRD.md", file=sys.stderr)
        return 1

    tasks = []
    for i, h in enumerate(headings, 1):
        key = f"T{i:02d}"
        title = h.strip()
        task = {
            "key": key,
            "title": title,
            "desc": f"From BRD: {title}",
            "estimate_h": 4,          # 後から編集してOK
            "deps": [],               # 後から編集してOK（例: ["T01"]）
            "labels": ["ai:task", "stage:impl"],
        }
        tasks.append(task)

    data = {"tasks": tasks}
    OUT_PATH.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True), encoding="utf-8")
    print(f"generated {OUT_PATH}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
