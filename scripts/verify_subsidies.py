"""
人手確認 (verified=true) を効率的に進めるための対話 CLI。

CLAUDE.md:
  「verified=true は人手確認済みのみ。LLM 抽出だけでは付けない」

使い方:
    export DATABASE_URL='postgresql://...'
    # 東京都プレフェクチャ全域 (本体 + 23特別区) を順に確認
    python -m scripts.verify_subsidies --prefecture tokyo

    # 特定の自治体だけ
    python -m scripts.verify_subsidies --body setagaya

    # 確認待ち件数だけ見る
    python -m scripts.verify_subsidies --prefecture tokyo --list-only

    # ID 指定で1件
    python -m scripts.verify_subsidies --id 42

操作:
    [v] verified=true にして次へ (verified_at=NOW)
    [s] スキップ (未確認のまま次へ)
    [o] 出典 URL をブラウザで開いて再表示
    [q] 終了
"""
import argparse
import os
import sys
import webbrowser
from typing import Optional

import psycopg
from psycopg.rows import dict_row


SELECT = """
    SELECT
        s.id, s.program_name, s.target_audience, s.category, s.subcategory,
        s.target_summary, s.benefit_summary,
        s.benefit_type, s.benefit_amount_max_yen, s.benefit_rate_percent,
        s.application_window_type, s.application_end, s.status, s.status_note,
        s.plain_summary, s.source_url,
        ob.name AS body_name,
        (SELECT COUNT(*) FROM benefit_tiers WHERE subsidy_id=s.id) AS n_tiers,
        (SELECT COUNT(*) FROM application_rounds WHERE subsidy_id=s.id) AS n_rounds
    FROM subsidies s
    JOIN operating_bodies ob ON s.operating_body_id = ob.id
    WHERE NOT s.verified
"""


def fmt_yen(n: Optional[int]) -> str:
    if n is None:
        return "-"
    if n >= 10_000:
        return f"{n // 10_000}万円" + (f"{n % 10_000:04d}" if n % 10_000 else "")
    return f"{n:,}円"


def show(s: dict, idx: int, total: int) -> None:
    print()
    print(f"\033[1m[{idx}/{total}]\033[0m \033[36m{s['body_name']}\033[0m / {s['program_name']}")
    sub = f" / {s['subcategory']}" if s["subcategory"] else ""
    print(
        f"  audience: \033[33m{s['target_audience']}\033[0m"
        f" | category: {s['category']}{sub}"
        f" | status: {s['status']}"
    )
    rate = f"{s['benefit_rate_percent']}%" if s["benefit_rate_percent"] is not None else "-"
    print(
        f"  amount: {fmt_yen(s['benefit_amount_max_yen'])}"
        f" | rate: {rate}"
        f" | tiers: {s['n_tiers']}"
        f" | rounds: {s['n_rounds']}"
    )
    if s["application_end"]:
        print(f"  application_end: {s['application_end']}")
    if s["status_note"]:
        print(f"  status_note: {s['status_note']}")
    print(f"  対象  : {s['target_summary'][:120]}")
    print(f"  内容  : {s['benefit_summary'][:120]}")
    print(f"  要約  : {s['plain_summary'][:140]}")
    print(f"  source: \033[34m{s['source_url']}\033[0m")


def mark_verified(conn, sub_id: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE subsidies SET verified=true, verified_at=NOW() WHERE id=%s",
            (sub_id,),
        )
    conn.commit()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--prefecture", help="prefecture code で絞り込み (例: tokyo)")
    p.add_argument("--body", help="自治体 code で絞り込み (例: setagaya)")
    p.add_argument("--id", type=int, help="特定の subsidy id を1件だけ表示")
    p.add_argument("--list-only", action="store_true", help="確認せず一覧表示のみ")
    p.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    args = p.parse_args()

    if not args.database_url:
        sys.exit("DATABASE_URL が未設定です")

    conditions: list[str] = []
    params: list = []
    if args.id:
        # id 指定時は verified の有無を問わず表示
        sql = SELECT.replace("WHERE NOT s.verified", "WHERE s.id = %s")
        params = [args.id]
    else:
        if args.prefecture:
            conditions.append("ob.prefecture_code = %s")
            params.append(args.prefecture)
        if args.body:
            conditions.append("ob.code = %s")
            params.append(args.body)
        sql = SELECT
        if conditions:
            sql += " AND " + " AND ".join(conditions)
        sql += " ORDER BY ob.code, s.id"

    with psycopg.connect(args.database_url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

        if not rows:
            print("対象なし")
            return

        if args.list_only:
            for s in rows:
                print(f"  [{s['id']:>4}] {s['body_name']} / {s['program_name'][:60]}")
            print(f"\n計 {len(rows)} 件")
            return

        verified = 0
        skipped = 0
        for i, s in enumerate(rows, 1):
            while True:
                show(s, i, len(rows))
                choice = input("\n  [v]erify [s]kip [o]pen [q]uit > ").strip().lower()
                if choice == "v":
                    mark_verified(conn, s["id"])
                    verified += 1
                    print("  ✓ verified")
                    break
                elif choice == "s":
                    skipped += 1
                    break
                elif choice == "o":
                    webbrowser.open(s["source_url"])
                    continue  # 再表示してから再選択
                elif choice == "q":
                    print(f"\n終了。 verified: {verified}, skipped: {skipped}")
                    return
                else:
                    print("  v / s / o / q から選んでください")

        print(f"\n完了。 verified: {verified}, skipped: {skipped}")


if __name__ == "__main__":
    main()
