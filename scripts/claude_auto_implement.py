#!/usr/bin/env python3
"""
Claude API を使用してIssueから自動実装を行うスクリプト
TDD原則に従い、テストコードも同時に生成
"""

import os
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional
from anthropic import Anthropic


def load_issue_data() -> Dict:
    """Issue情報を読み込み"""
    with open('out/current_issue.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def load_claude_rules() -> str:
    """CLAUDE.mdルールを読み込み"""
    claude_md_path = Path('CLAUDE.md')
    if claude_md_path.exists():
        with open(claude_md_path, 'r', encoding='utf-8') as f:
            return f.read()
    return ""


def load_stack_profile() -> str:
    """スタックプロファイルを読み込み"""
    profiles_dir = Path('profiles')
    if not profiles_dir.exists():
        return ""

    # 使用可能なプロファイルを検索
    profiles = list(profiles_dir.glob('stack_*.md'))
    if not profiles:
        return ""

    # 最初のプロファイルを使用（実際には設定で選択可能にすべき）
    with open(profiles[0], 'r', encoding='utf-8') as f:
        return f.read()


def get_project_context() -> str:
    """プロジェクトのコンテキストを取得"""
    context = []

    # package.json の確認
    if Path('package.json').exists():
        with open('package.json', 'r') as f:
            package_data = json.load(f)
            context.append(f"プロジェクトタイプ: Node.js/TypeScript")
            context.append(f"プロジェクト名: {package_data.get('name', 'unknown')}")

    # requirements.txt の確認
    if Path('requirements.txt').exists():
        context.append(f"プロジェクトタイプ: Python")

    # ディレクトリ構造の確認
    important_dirs = ['src', 'app', 'frontend', 'backend', 'tests', 'spec']
    existing_dirs = [d for d in important_dirs if Path(d).exists()]
    if existing_dirs:
        context.append(f"存在するディレクトリ: {', '.join(existing_dirs)}")

    return "\n".join(context)


def generate_implementation_prompt(issue_data: Dict, claude_rules: str, stack_profile: str) -> str:
    """実装用プロンプトを生成"""
    project_context = get_project_context()

    prompt = f"""あなたはエキスパートのソフトウェアエンジニアです。
以下のIssueを実装してください。

## Issue情報
- 番号: #{issue_data['number']}
- タイトル: {issue_data['title']}
- 内容:
{issue_data.get('body', 'なし')}
- 優先度: {issue_data.get('priority', 'P2')}

## プロジェクトコンテキスト
{project_context}

## 遵守すべきルール（CLAUDE.md）
{claude_rules}

## スタックプロファイル
{stack_profile}

## 実装要件
1. **TDD原則に従う**: 最初にテストを書き、その後実装を行う
2. **PRサイズ制限**: 10ファイル / 500行以内に収める
3. **責務分離**: 各レイヤーの責務を明確に分離
4. **セキュリティ**: Secrets や認証情報をコミットしない
5. **エラーハンドリング**: 適切なエラーハンドリングを実装

## 出力形式
JSON形式で以下の構造で出力してください:

```json
{{
  "files": [
    {{
      "path": "ファイルパス",
      "content": "ファイルの内容",
      "type": "implementation|test|config"
    }}
  ],
  "summary": "実装の要約",
  "test_plan": "テスト計画",
  "notes": "追加の注意事項やTODO"
}}
```

必ず有効なJSONを出力してください。
"""

    return prompt


def apply_implementation(implementation: Dict) -> bool:
    """生成された実装をファイルに適用"""
    try:
        for file_info in implementation.get('files', []):
            file_path = Path(file_info['path'])

            # ディレクトリが存在しない場合は作成
            file_path.parent.mkdir(parents=True, exist_ok=True)

            # ファイルに書き込み
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(file_info['content'])

            print(f"✅ {file_info['type']}: {file_path}")

        # サマリーをログファイルに保存
        with open('out/implementation_summary.json', 'w', encoding='utf-8') as f:
            json.dump({
                'summary': implementation.get('summary', ''),
                'test_plan': implementation.get('test_plan', ''),
                'notes': implementation.get('notes', ''),
                'files_count': len(implementation.get('files', []))
            }, f, ensure_ascii=False, indent=2)

        return True

    except Exception as e:
        print(f"❌ 実装の適用に失敗: {e}")
        return False


def main():
    """メイン処理"""
    # 環境変数チェック
    token = os.environ.get('CLAUDE_CODE_OAUTH_TOKEN')
    if not token:
        print("❌ CLAUDE_CODE_OAUTH_TOKEN が設定されていません")
        sys.exit(1)

    # Issue データ読み込み
    try:
        issue_data = load_issue_data()
        print(f"📋 Issue #{issue_data['number']}: {issue_data['title']}")
    except Exception as e:
        print(f"❌ Issue データの読み込みに失敗: {e}")
        sys.exit(1)

    # ルールとプロファイル読み込み
    claude_rules = load_claude_rules()
    stack_profile = load_stack_profile()

    # Claude API 初期化
    client = Anthropic(api_key=token)

    # プロンプト生成
    prompt = generate_implementation_prompt(issue_data, claude_rules, stack_profile)

    print("🤖 Claude による実装を開始...")

    try:
        # Claude API 呼び出し
        response = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=4000,
            temperature=0.3,
            system="あなたは優秀なソフトウェアエンジニアです。TDD原則に従い、高品質なコードを生成します。必ず有効なJSON形式で出力してください。",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        # レスポンスからJSON部分を抽出
        response_text = response.content[0].text

        # JSON部分を抽出（```json ... ``` の間を取得）
        import re
        json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # 全体がJSONの場合
            json_str = response_text

        # JSONパース
        implementation = json.loads(json_str)

        print(f"📝 {len(implementation.get('files', []))} ファイルの実装を生成しました")

        # 実装を適用
        if apply_implementation(implementation):
            print("✅ 実装が正常に完了しました")

            # 実装サマリーを出力
            print("\n📊 実装サマリー:")
            print(f"  {implementation.get('summary', 'なし')}")

            if implementation.get('test_plan'):
                print(f"\n🧪 テスト計画:")
                print(f"  {implementation.get('test_plan')}")

            if implementation.get('notes'):
                print(f"\n📝 注記:")
                print(f"  {implementation.get('notes')}")

        else:
            print("❌ 実装の適用に失敗しました")
            sys.exit(1)

    except json.JSONDecodeError as e:
        print(f"❌ Claude のレスポンスのパースに失敗: {e}")
        print(f"レスポンス: {response_text[:500]}...")
        sys.exit(1)

    except Exception as e:
        print(f"❌ Claude API エラー: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()