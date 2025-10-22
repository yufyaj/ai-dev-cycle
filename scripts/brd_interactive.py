#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ローカル対話で BRD を作成/更新するウィザード。

出力先: docs/requirements/BRD.md（ディレクトリがなければ作成）
作成後に scripts/validate_brd.py --json を実行し、合否を表示。

使い方:
  python3 scripts/brd_interactive.py
"""
import os
import sys
import json
from pathlib import Path
from textwrap import dedent
import subprocess

DOCS_BRD = Path("docs/requirements/BRD.md")


def prompt(msg: str, default: str | None = None) -> str:
    label = f"{msg}"
    if default:
        label += f" [{default}]"
    label += ": "
    v = input(label).strip()
    return v or (default or "")


def prompt_yes(msg: str, default_yes=True) -> bool:
    d = "Y/n" if default_yes else "y/N"
    v = input(f"{msg} ({d}): ").strip().lower()
    if not v:
        return default_yes
    return v in ("y", "yes", "true", "1")


def collect_acceptance(kind: str) -> list[str]:
    print(f"- {kind} の Acceptance Criteria を入力（最低1つ、空行で終了）")
    acc = []
    while True:
        print("  例) Given: ... / When: ... / Then: ...")
        line = input("  > ").strip()
        if not line:
            if acc:
                break
            else:
                print("  少なくとも1件入力してください")
                continue
        acc.append(line)
    return acc


def collect_features() -> list[dict]:
    feats = []
    print("\n=== 機能(H2)を追加します。最低1つ ===")
    while True:
        title = prompt("機能名（H2見出し）", None)
        summary = prompt("機能の概要（1-2行）", "")
        normal = collect_acceptance("正常系")
        abnormal = collect_acceptance("異常系")
        feats.append({
            "title": title,
            "summary": summary,
            "normal": normal,
            "abnormal": abnormal,
        })
        if not prompt_yes("他の機能も追加しますか?", default_yes=False):
            break
    return feats


def build_brd_md(title: str, background: str, purpose: str,
                 scope_in: list[str], scope_out: list[str],
                 features: list[dict],
                 nonfunc: list[str], kpis: list[str],
                 risks: list[str], glossary: list[tuple[str, str]]
                 ) -> str:
    lines: list[str] = []
    lines.append(f"# {title}\n")
    lines.append("### 1. 背景と目的\n")
    lines.append("### 1.1 背景\n" + background.strip() + "\n")
    lines.append("### 1.2 目的\n" + purpose.strip() + "\n")

    lines.append("### 2. スコープ\n")
    lines.append("#### 2.1 スコープIn（初期リリースに含む）")
    for s in scope_in:
        lines.append(f"- {s}")
    lines.append("")
    lines.append("#### 2.2 スコープOut（初期リリースに含まない）")
    for s in scope_out:
        lines.append(f"- {s}")
    lines.append("")

    # Features (H2)
    for i, f in enumerate(features, 1):
        lines.append(f"## {f['title']}\n")
        if f.get("summary"):
            lines.append("### 概要\n" + f["summary"].strip() + "\n")
        lines.append("### Acceptance Criteria\n")
        lines.append("#### 正常系")
        for n in f["normal"]:
            lines.append(f"- {n}")
        lines.append("")
        lines.append("#### 異常系")
        for n in f["abnormal"]:
            lines.append(f"- {n}")
        lines.append("")

    lines.append("### 10. 非機能要件\n")
    for nf in nonfunc:
        lines.append(f"- {nf}")
    lines.append("")

    lines.append("### 11. KPI\n")
    for k in kpis:
        lines.append(f"- {k}")
    lines.append("")

    lines.append("### 12. リスクと制約\n")
    for r in risks:
        lines.append(f"- {r}")
    lines.append("")

    lines.append("### 13. 用語集\n")
    if glossary:
        lines.append("| 用語 | 定義 |")
        lines.append("|------|------|")
        for term, defi in glossary:
            lines.append(f"| {term} | {defi} |")
    else:
        lines.append("(必要に応じて追記)")

    return "\n".join(lines).strip() + "\n"


def run_validate() -> dict:
    try:
        p = subprocess.run(
            [sys.executable, "scripts/validate_brd.py", "--json"],
            capture_output=True, text=True, check=False
        )
        print(p.stdout)
        return json.loads(p.stdout or "{}")
    except Exception as e:
        print(f"検証の実行に失敗しました: {e}")
        return {"ok": False, "errors": [{"msg": str(e)}]}


def main() -> int:
    print("\n== BRD ローカル作成ウィザード ==\n")
    if DOCS_BRD.exists():
        print(f"既存のBRDが見つかりました: {DOCS_BRD}")
        if not prompt_yes("上書きして作成し直しますか?", default_yes=False):
            print("中止しました。")
            return 0

    os.makedirs(DOCS_BRD.parent, exist_ok=True)

    title = prompt("タイトル", "フォーム営業管理ツール")
    background = prompt("背景（複数行可。終了は空行）", "フォーム営業の進捗/実績/報告が煩雑")
    if not background:
        background = "背景未記入"
    purpose = prompt("目的（複数行可。終了は空行）", "一元管理と効率化/可視化の実現")
    if not purpose:
        purpose = "目的未記入"

    print("\nスコープIn を箇条書きで入力（最低1つ、空行で終了）")
    scope_in = []
    while True:
        s = input("  IN> ").strip()
        if not s:
            if scope_in:
                break
            print("  少なくとも1件入力してください")
            continue
        scope_in.append(s)

    print("\nスコープOut を箇条書きで入力（空行で終了）")
    scope_out = []
    while True:
        s = input("  OUT> ").strip()
        if not s:
            break
        scope_out.append(s)

    features = collect_features()

    # 非機能/KPI/リスク/用語は簡潔に初期値を用意
    nonfunc = [
        "レスポンスタイム: 3秒以内 (P95)",
        "稼働率: 99.9%",
        "認証/認可: RBAC、セッション1時間",
        "ログ・トレースID付与、監査ログ記録",
        "Secretsは環境変数/Secrets管理で外部化",
    ]
    if prompt_yes("非機能要件を編集しますか?", default_yes=False):
        nonfunc = []
        print("非機能要件を箇条書きで入力（空行で終了）")
        while True:
            s = input("  NF> ").strip()
            if not s:
                break
            nonfunc.append(s)

    kpis = [
        "ワーカーの入力時間: 平均2分/件以下",
        "管理者の進捗確認時間: 週次1時間以下",
        "レスポンスP95: 3秒以内",
    ]
    if prompt_yes("KPIを編集しますか?", default_yes=False):
        kpis = []
        print("KPIを箇条書きで入力（空行で終了）")
        while True:
            s = input("  KPI> ").strip()
            if not s:
                break
            kpis.append(s)

    risks = [
        "大量インポート時のタイムアウト",
        "ワーカー変更時の整合性",
    ]
    if prompt_yes("リスク/制約を編集しますか?", default_yes=False):
        risks = []
        print("リスク/制約を箇条書きで入力（空行で終了）")
        while True:
            s = input("  RISK> ").strip()
            if not s:
                break
            risks.append(s)

    glossary: list[tuple[str, str]] = []
    if prompt_yes("用語集を追加しますか?", default_yes=False):
        while True:
            term = input("  用語（空行で終了）> ").strip()
            if not term:
                break
            defi = input("  定義> ").strip()
            glossary.append((term, defi))

    md = build_brd_md(title, background, purpose, scope_in, scope_out,
                      features, nonfunc, kpis, risks, glossary)

    DOCS_BRD.write_text(md, encoding="utf-8")
    print(f"\n📝 書き出し: {DOCS_BRD}")

    print("\n🔎 体裁検証を実行します ...\n")
    res = run_validate()
    if res.get("ok"):
        print("✅ BRD format OK")
        return 0
    else:
        print("❌ BRD format NG")
        for e in res.get("errors", []):
            print(f" - [{e.get('code','')}] {e.get('msg','')}")
        print("\nファイルを直接編集して再実行してください。")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

