"""
JSON → PostgreSQL マイグレーション

抽出された JSON ファイル (data/extracted/) を Postgres にロードする。

Usage:
    export DATABASE_URL='postgresql://user:pass@localhost/tokyo_subsidy'
    python -m db.migrate_from_json --extracted data/extracted
"""
import argparse
import json
import logging
import os
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate")


def build_name_to_code(cur) -> dict[str, str]:
    """operating_bodies テーブルから 自治体名 → code のマップを構築する。

    全国マスタ (data/seeds.yaml → load_bodies) を唯一の情報源とするため、
    ハードコードの対応表は持たない。
    """
    cur.execute("SELECT code, name FROM operating_bodies")
    return {r["name"]: r["code"] for r in cur.fetchall()}


def resolve_body_code(body_name: str, name_to_code: dict[str, str]) -> str | None:
    """実施主体名 → code。完全一致 → 部分一致の順で探す。見つからなければ None。"""
    if body_name in name_to_code:
        return name_to_code[body_name]
    # 部分一致 (例: '東京都 (公財)東京都中小企業振興公社' → tokyo)。
    # より長い自治体名を優先 (例: '東京都世田谷区' は '世田谷区' を先に当てる)。
    for name in sorted(name_to_code, key=len, reverse=True):
        if name in body_name:
            return name_to_code[name]
    return None


def upsert_subsidy(cur, sub: dict, body_id: int, extracted_at: str | None = None):
    """1件の補助金を upsert。extracted_at は extraction_metadata から渡す。"""
    cur.execute(
        """
        INSERT INTO subsidies (
            program_name, operating_body_id, category, subcategory, target_audience,
            target_summary, target_age_min, target_age_max, target_household,
            target_income_max_yen, target_residency_required,
            benefit_summary, benefit_type, benefit_amount_max_yen,
            benefit_rate_percent, eligible_expense_categories, selection_quota,
            application_window_type, application_window_note,
            application_start, application_end, application_method, required_documents,
            status, status_note,
            contact, source_url, plain_summary, verified, extracted_at
        )
        VALUES (
            %(program_name)s, %(body_id)s, %(category)s, %(subcategory)s, %(target_audience)s,
            %(target_summary)s, %(target_age_min)s, %(target_age_max)s, %(target_household)s,
            %(target_income_max_yen)s, %(target_residency_required)s,
            %(benefit_summary)s, %(benefit_type)s, %(benefit_amount_max_yen)s,
            %(benefit_rate_percent)s, %(eligible_expense_categories)s, %(selection_quota)s,
            %(application_window_type)s, %(application_window_note)s,
            %(application_start)s, %(application_end)s, %(application_method)s, %(required_documents)s,
            %(status)s, %(status_note)s,
            %(contact)s, %(source_url)s, %(plain_summary)s, %(verified)s, %(extracted_at)s
        )
        ON CONFLICT (source_url) DO UPDATE SET
            program_name          = EXCLUDED.program_name,
            category              = EXCLUDED.category,
            target_audience       = EXCLUDED.target_audience,
            target_summary        = EXCLUDED.target_summary,
            benefit_summary       = EXCLUDED.benefit_summary,
            benefit_type          = EXCLUDED.benefit_type,
            benefit_amount_max_yen= EXCLUDED.benefit_amount_max_yen,
            status                = EXCLUDED.status,
            status_note           = EXCLUDED.status_note,
            plain_summary         = EXCLUDED.plain_summary,
            verified              = EXCLUDED.verified,
            extracted_at          = EXCLUDED.extracted_at,
            updated_at            = NOW()
        RETURNING id;
        """,
        {
            "program_name": sub["program_name"],
            "body_id": body_id,
            "category": sub["category"],
            "subcategory": sub.get("subcategory"),
            "target_audience": sub.get("target_audience", "不明"),
            "target_summary": sub["target_summary"],
            "target_age_min": sub.get("target_age_min"),
            "target_age_max": sub.get("target_age_max"),
            "target_household": json.dumps(sub.get("target_household") or [], ensure_ascii=False),
            "target_income_max_yen": sub.get("target_income_max_yen"),
            "target_residency_required": sub.get("target_residency_required", True),
            "benefit_summary": sub["benefit_summary"],
            "benefit_type": sub.get("benefit_type", "不明"),
            "benefit_amount_max_yen": sub.get("benefit_amount_max_yen"),
            "benefit_rate_percent": sub.get("benefit_rate_percent"),
            "eligible_expense_categories": json.dumps(sub.get("eligible_expense_categories"), ensure_ascii=False) if sub.get("eligible_expense_categories") else None,
            "selection_quota": sub.get("selection_quota"),
            "application_window_type": sub.get("application_window_type"),
            "application_window_note": sub.get("application_window_note"),
            "application_start": sub.get("application_start"),
            "application_end": sub.get("application_end"),
            "application_method": sub.get("application_method"),
            "required_documents": json.dumps(sub.get("required_documents"), ensure_ascii=False) if sub.get("required_documents") else None,
            "status": sub.get("status", "不明"),
            "status_note": sub.get("status_note"),
            "contact": sub.get("contact"),
            "source_url": sub["source_url"],
            "plain_summary": sub["plain_summary"],
            # CLAUDE.md: verified=true は人手確認済みのみ。LLM 抽出だけでは付けない。
            # JSON が明示的に "verified": true を持つ場合だけ true にする。
            "verified": bool(sub.get("verified", False)),
            "extracted_at": extracted_at,
        },
    )
    return cur.fetchone()["id"]


def upsert_rounds(cur, subsidy_id: int, rounds: list[dict]):
    """application_rounds を upsert。"""
    cur.execute("DELETE FROM application_rounds WHERE subsidy_id = %s", (subsidy_id,))
    for r in rounds:
        cur.execute(
            """INSERT INTO application_rounds (subsidy_id, round_number, start_date, end_date, note)
               VALUES (%s, %s, %s, %s, %s)""",
            (subsidy_id, r["round_number"], r.get("start_date"), r.get("end_date"), r.get("note"))
        )


def upsert_relations(cur, subsidy_id: int, relations: list[dict]):
    """subsidy_relations を upsert。"""
    cur.execute("DELETE FROM subsidy_relations WHERE subsidy_id = %s", (subsidy_id,))
    for rel in relations:
        cur.execute(
            """INSERT INTO subsidy_relations (subsidy_id, related_program_name, relation_type, note)
               VALUES (%s, %s, %s, %s)""",
            (subsidy_id, rel["program_name"], rel["relation_type"], rel.get("note"))
        )


def upsert_tiers(cur, subsidy_id: int, tiers: list[dict]):
    """benefit_tiers を upsert (v0.4: 段階金額)。"""
    cur.execute("DELETE FROM benefit_tiers WHERE subsidy_id = %s", (subsidy_id,))
    for t in tiers:
        cur.execute(
            """INSERT INTO benefit_tiers
               (subsidy_id, condition_type, condition_label, amount_yen, rate_percent, note)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (
                subsidy_id,
                t["condition_type"],
                t["condition_label"],
                t.get("amount_yen"),
                t.get("rate_percent"),
                t.get("note"),
            ),
        )


def upsert_goods(cur, subsidy_id: int, items: list[dict]):
    """goods_items を upsert (v0.4: 現物給付の品目)。"""
    cur.execute("DELETE FROM goods_items WHERE subsidy_id = %s", (subsidy_id,))
    for g in items:
        cur.execute(
            """INSERT INTO goods_items
               (subsidy_id, item_name, quantity_note, stock_limited, note)
               VALUES (%s, %s, %s, %s, %s)""",
            (
                subsidy_id,
                g["item_name"],
                g.get("quantity_note"),
                g.get("stock_limited", False),
                g.get("note"),
            ),
        )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--extracted", required=True, help="JSON ディレクトリ")
    p.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    args = p.parse_args()

    if not args.database_url:
        raise SystemExit("DATABASE_URL not set")

    extracted = Path(args.extracted)
    files = list(extracted.rglob("*.json"))
    logger.info("Found %d JSON files", len(files))

    inserted = 0
    with psycopg.connect(args.database_url, row_factory=dict_row) as conn:
        # 自治体マスタ (operating_bodies) を事前取得
        with conn.cursor() as cur:
            cur.execute("SELECT id, code FROM operating_bodies")
            code_to_id = {r["code"]: r["id"] for r in cur.fetchall()}
            name_to_code = build_name_to_code(cur)
        if not code_to_id:
            raise SystemExit(
                "operating_bodies が空です。先に db.load_bodies を実行してください。"
            )

        for f in files:
            data = json.loads(f.read_text(encoding="utf-8"))
            # ファイル単位の extracted_at を全 subsidy に共通で付与
            extracted_at = (data.get("extraction_metadata") or {}).get("extracted_at")
            subsidies = data.get("subsidies", [])
            for sub in subsidies:
                code = resolve_body_code(sub["operating_body"], name_to_code)
                body_id = code_to_id.get(code) if code else None
                if not body_id:
                    logger.warning("Unknown body: %s", sub["operating_body"])
                    continue

                with conn.cursor() as cur:
                    sid = upsert_subsidy(cur, sub, body_id, extracted_at)
                    if sub.get("application_rounds"):
                        upsert_rounds(cur, sid, sub["application_rounds"])
                    if sub.get("related_programs"):
                        upsert_relations(cur, sid, sub["related_programs"])
                    if sub.get("benefit_tiers"):
                        upsert_tiers(cur, sid, sub["benefit_tiers"])
                    if sub.get("goods_items"):
                        upsert_goods(cur, sid, sub["goods_items"])
                inserted += 1
                logger.info("  → %s", sub["program_name"][:60])
        conn.commit()

    logger.info("Done. Inserted/updated %d subsidies.", inserted)


if __name__ == "__main__":
    main()
