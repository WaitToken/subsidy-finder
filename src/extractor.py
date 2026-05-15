"""
LLM 抽出パイプライン v0.4

v0.1 → v0.2 変更:
  - 新フィールド (benefit_type, application_window_type, status_note, related_programs)
    に対応したプロンプト
  - Few-shot 例を3件追加 (現金型・ポイント型・条件付き期限型)
  - パターン認識キーワード集を明示

v0.2 → v0.3 変更:
  - 経費補助型フィールド (benefit_rate_percent, eligible_expense_categories,
    selection_quota, application_rounds) に対応したプロンプト
  - Few-shot 例を1件追加 (経費補助型・採択枠・複数回募集 = 創業助成事業パターン)
  - save_result が extraction_metadata (schema_version 等) を付与

v0.3 → v0.4 変更:
  - 段階金額 (benefit_tiers) と現物給付の品目 (goods_items) に対応したプロンプト
  - Few-shot 例を1件追加 (車種別段階金額 = EV補助パターン)

v0.4 → v0.5 変更:
  - 個人向け / 事業者向け を対等に収集。target_audience でタグ付け
  - 「個人向け限定」の除外ルールを撤回
"""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import anthropic

from .schema import ExtractionResult

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"
EXTRACTOR_VERSION = "0.5.0"
SCHEMA_VERSION = "0.5"

SYSTEM_PROMPT = """\
あなたは日本の自治体ウェブサイトから補助金・助成金情報を抽出する専門アシスタントです。
ページの内容を save_extraction ツールで構造化して返してください。

# 基本ルール
1. ページが補助金紹介ページでない場合 (お知らせ・カテゴリ一覧・トップページ等):
   page_was_a_subsidy_page=false で subsidies=[] を返す。
2. 「終了しました」「受付終了」と明記がある場合は status="終了"。
   plain_summary に「※受付終了」と明記する。
3. 推測しない。書かれていない情報は null またはデフォルト。
4. 個人向け・事業者向けの両方を収集する。どちらかを除外しない。
   申請者が誰かは target_audience フィールドで必ず区別する。

# フィールド別の判定ガイド

## target_audience (個人向け / 事業者向け)  ← v0.5
申請できるのが誰かで判定する。このサービスの最重要の区分軸。
- 生活者・個人 (子育て世帯・高齢者・学生・求職者など)、
  および個人事業主・創業予定者・フリーランスが申請できる → "個人"
- 法人・企業・施設・団体・自治会のみが申請できる
  (私立学校の運営費補助、介護施設の職員賃上げ補助、企業の輸出支援など) → "事業者"
- 個人も事業者もどちらも申請できる → "両方"
- 判別できない → "不明"

## benefit_type (給付の形態)
- 「○○円を交付/支給」→ "現金"
- 「○○Pay」「○○ポイント」「電子マネー」→ "ポイント・電子マネー"
- 「商品券」「ギフトカード」→ "商品券・クーポン"
- 「派遣」「訪問」「相談」等のサービス → "サービス提供"
- 「ベビー用品」「マスク配布」等の物品 → "現物給付"
- 現金とポイントなど複数混在 → "複合"
※「せたがやPay」「品川区しながわPay」等は明確にポイント型。
※ポイント給付を絶対に "現金" と記録しないこと。

## benefit_amount_max_yen (最大支給額の円換算)
- 「10万ポイント」「10万円相当の商品券」→ 100000 を記録
- 「最大30万円」→ 300000
- 「個別判断」「世帯による」「上限なし」→ null
- 「月3.5万円 × 24ヶ月」のような期間給付 → 累計額 (例: 840000)
- benefit_tiers (段階金額) を埋めた場合も、全段階の最大額をここに必ず入れる。
  例: 軽EV45万/普通EV60万/燃料電池車110万 → 1100000。tiers があるからと null にしない

## benefit_rate_percent (経費補助率 %)  ← v0.3
経費の一定割合を補助するタイプの制度で使う。
- 「助成率 2/3以内」→ 67
- 「補助率 1/2」→ 50
- 「経費の90%を補助」→ 90
- 「定額10万円を給付」のような固定額のみの制度 → null
※「経費の○○%以内、上限○○万円」のような制度は、
  benefit_rate_percent と benefit_amount_max_yen の両方を必ず埋める。
  上限額だけを benefit_amount_max_yen に押し込まないこと。

## eligible_expense_categories (対象経費カテゴリ)  ← v0.3
経費補助型のとき、補助対象となる経費の種類をリストで記録する。
- 「賃借料、広告費、人件費等が対象」→ ["賃借料", "広告費", "人件費"]
- 固定額給付で対象経費の概念がない → null

## selection_quota (採択枠の件数)  ← v0.3
- 「採択予定数 200社」「50件程度を採択」→ 200 / 50
- 審査で採択件数の枠が決まっている制度に使う
- 先着順・抽選で枠数の記載がない場合や、枠の概念がない場合 → null

## benefit_tiers (段階金額)  ← v0.4
金額が条件によって段階的に変わる制度で使う。各段階を records で記録する。
- EV補助「軽EV 45万円 / 普通EV 60万円 / 燃料電池車 110万円」
  → condition_type="車種" の3段階
- 高校学費助成「年収910万円未満 全額 / 910万円以上 一部補助」
  → condition_type="所得区分" の段階
- 「第3子以降は増額」する子育て給付 → condition_type="子の出生順"
※ benefit_amount_max_yen には全段階の最大額を入れ、内訳を benefit_tiers に記録する。
※ 金額が単一で条件分岐がない制度では空リスト []。

## goods_items (現物給付の品目)  ← v0.4
benefit_type が "現物給付" または "複合" のとき、配布される品目を記録する。
- 「新生児用肌着セットを1世帯1点配布。数量限定」
  → [{item_name: "新生児用肌着セット", quantity_note: "1世帯1点", stock_limited: true}]
- 「先着順」「なくなり次第終了」「数量限定」の表現があれば stock_limited=true
- 現金・ポイント給付のみで現物がない制度では空リスト []。

## application_window_type (期限の性質)
- 「〜令和8年3月31日まで」のような固定日付 → "固定日付"
- 「転居日から90日以内」「出産後3ヶ月以内」のような相対期限 → "イベント基準"
- 「随時受付」「通年」 → "通年"
- 「予算上限まで」「先着順で締切」 → "予算枠まで"

## application_window_note (期限の自然言語説明)
application_window_type が "イベント基準" "予算枠まで" の場合は必ず埋める。
例: "転居日から90日以内", "予算が上限に達した時点で受付終了", "先着順"

## application_rounds (複数回募集)  ← v0.3
年に複数回の募集回がある制度は、各回を application_rounds に記録する。
- 「第1回 4月1日〜4月30日、第2回 9月1日〜9月30日」
  → [{round_number: 1, start_date: "2026-04-01", end_date: "2026-04-30"},
      {round_number: 2, start_date: "2026-09-01", end_date: "2026-09-30"}]
- 各回に特記事項があれば note に ("電子申請のみ" 等)
- 単発募集の場合は空リスト []。その場合は application_start / application_end を使う。

## status_note (ステータス補足)
- 「予算上限に達した場合、受付を終了します」→ "予算上限到達で早期終了の可能性あり"
- 「先着順」→ "先着順"
- 「抽選」→ "抽選"
- 該当しなければ null

## related_programs (関連制度)
ページに以下の表現がある場合に記録:
- 「○○事業との併用で最大○○円」→ relation_type="併用可能"
- 「○○の対象者が申請できます」→ relation_type="前提"
- 「○○とは併用できません」→ relation_type="代替"
- 「関連リンク」「あわせて読みたい」セクションの制度 → relation_type="関連"

## plain_summary (一般人向け要約・200字以内)
中学生でも理解できる、丁寧だが堅苦しくない日本語で、以下の3要素を必ず含める:
1. 誰がもらえるか (居住・年齢・家族構成)
2. いくら/何がもらえるか (金額と給付形態)
3. いつまでに/どうやって申請するか
ポイント給付の場合は「現金ではなく○○Payでポイント還元」のように明記する。
経費補助型の場合は「経費の○分の○まで (上限○○万円)」のように補助率も明記する。
"""

# Few-shot examples to guide the LLM
FEW_SHOT_EXAMPLES = """\
# 抽出例

## 例1: 現金型・固定日付
入力: 「東京都内に居住し、不妊治療を受ける夫婦に1回最大15万円を助成。令和8年3月31日まで申請受付。」
→ benefit_type="現金", amount=150000, window_type="固定日付", application_end="2026-03-31"

## 例2: ポイント型・条件付き期限・予算依存
入力: 「区内転居の子育て世帯にせたがやPay10万ポイントを交付。転居から90日以内に申請。予算上限到達で受付終了。」
→ benefit_type="ポイント・電子マネー", amount=100000,
   window_type="イベント基準", window_note="転居日から90日以内",
   status="募集中", status_note="予算上限到達で早期終了の可能性あり"

## 例3: 併用関係あり
入力: 「定住応援事業と併用で最大70万円相当を交付」
→ related_programs=[{program_name: "多世代近居・同居応援事業",
                     relation_type: "併用可能",
                     note: "併用で最大70万円相当"}]

## 例4: 経費補助型・採択枠あり・複数回募集 (v0.3)
入力: 「創業助成事業。創業初期に必要な経費 (賃借料・人件費・広告費等) の3分の2以内、
        最大400万円を助成。採択予定数200件。第1回受付は令和8年4月、第2回は10月。」
→ benefit_type="現金", benefit_amount_max_yen=4000000, benefit_rate_percent=67,
   eligible_expense_categories=["賃借料", "人件費", "広告費"],
   selection_quota=200,
   application_rounds=[{round_number: 1, ...}, {round_number: 2, ...}]

## 例5: 車種別の段階金額 (v0.4)
入力: 「電気自動車購入費補助。軽EVは45万円、普通EVは60万円、燃料電池車は110万円を補助。」
→ benefit_type="現金", benefit_amount_max_yen=1100000,
   benefit_tiers=[
     {condition_type: "車種", condition_label: "軽EV",       amount_yen: 450000},
     {condition_type: "車種", condition_label: "普通EV",     amount_yen: 600000},
     {condition_type: "車種", condition_label: "燃料電池車", amount_yen: 1100000}]
"""

USER_TEMPLATE = """\
以下のページから補助金情報を抽出してください。

ソースURL: {url}
ページタイトル: {title}
取得日: {fetched_at}

=== 本文 ===
{content}
=== 本文ここまで ===
"""


def _tool_schema() -> dict:
    schema = ExtractionResult.model_json_schema()
    return {
        "name": "save_extraction",
        "description": "抽出した補助金制度のリストを保存する",
        "input_schema": schema,
    }


def extract_from_page(
    url: str,
    title: str,
    content: str,
    fetched_at: str,
    client: anthropic.Anthropic | None = None,
    max_content_chars: int = 30_000,
) -> ExtractionResult:
    """1ページから補助金情報を抽出する。"""
    client = client or anthropic.Anthropic()
    content = content[:max_content_chars]

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT + "\n" + FEW_SHOT_EXAMPLES,
        tools=[_tool_schema()],
        tool_choice={"type": "tool", "name": "save_extraction"},
        messages=[
            {
                "role": "user",
                "content": USER_TEMPLATE.format(
                    url=url, title=title, content=content, fetched_at=fetched_at
                ),
            }
        ],
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "save_extraction":
            return ExtractionResult.model_validate(block.input)

    logger.warning("No tool_use block found in response for %s", url)
    return ExtractionResult(page_was_a_subsidy_page=False, subsidies=[])


def save_result(result: ExtractionResult, out_dir: Path, source_url: str) -> Path:
    """抽出結果を JSON で保存。

    data/extracted/setagaya-zutto-v02.json と同じ
    {extraction_metadata, subsidies} 形式で出力する。
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    safe = source_url.replace("https://", "").replace("/", "_").replace("?", "_")[:200]
    path = out_dir / f"{safe}.json"

    payload = {
        "extraction_metadata": {
            "source_pages": [source_url],
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "extractor_version": EXTRACTOR_VERSION,
            "schema_version": SCHEMA_VERSION,
            "model": MODEL,
            "page_was_a_subsidy_page": result.page_was_a_subsidy_page,
        },
        "subsidies": [
            s.model_dump(mode="json", exclude_none=True) for s in result.subsidies
        ],
    }
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return path
