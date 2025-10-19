#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
requirements/BRD.md の体裁検査。
- デフォルト: 人間可読エラー
- --json: 構造化エラー（サブエージェントが機械処理しやすい）
終了コード: 0=OK, 1=NG
"""
import re, sys, json
from pathlib import Path
import argparse

p = Path("requirements/BRD.md")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    errs = []
    if not p.exists():
        errs.append({"code":"MISSING_FILE","msg":"requirements/BRD.md is missing"})
    else:
        t = p.read_text(encoding="utf-8")
        if len(t) > 200_000 or t.count("\n") > 4000:
            errs.append({"code":"TOO_LARGE","msg":"BRD too large; keep it concise"})
        h1 = re.findall(r"^#\s+.+$", t, flags=re.M)
        h2 = re.findall(r"^##\s+.+$", t, flags=re.M)
        if len(h1) != 1:
            errs.append({"code":"H1_COUNT","msg":"Exactly one H1 required"})
        if len(h2) < 1:
            errs.append({"code":"H2_MISSING","msg":"At least one H2 required"})
        # 各H2セクションに Acceptance Criteria があるか
        sections = re.split(r"(?m)^##\s+", t)
        for idx, sec in enumerate(sections[1:], start=1):
            if re.search(r"(?i)Acceptance\s+Criteria", sec) is None:
                errs.append({"code":"AC_MISSING","msg":f"Section #{idx} needs 'Acceptance Criteria'"})

    ok = (len(errs) == 0)

    if args.json:
        print(json.dumps({"ok": ok, "errors": errs}, ensure_ascii=False, indent=2))
    else:
        if ok:
            print("BRD format OK")
        else:
            for e in errs:
                print(f"[{e['code']}] {e['msg']}", file=sys.stderr)

    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
