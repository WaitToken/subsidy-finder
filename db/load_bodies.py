"""
自治体マスタ投入

data/seeds.yaml (自治体マスタの single source of truth) を
operating_bodies テーブルへ upsert する。

実行順序: schema.sql 適用 → load_bodies → migrate_from_json

Usage:
    export DATABASE_URL='postgresql://dev:dev@localhost:5432/tokyo_subsidy'
    python -m db.load_bodies --seeds data/seeds.yaml
"""
import argparse
import logging
import os
from pathlib import Path

import psycopg
import yaml

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("load_bodies")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--seeds", default="data/seeds.yaml", help="自治体マスタ YAML")
    p.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    args = p.parse_args()

    if not args.database_url:
        raise SystemExit("DATABASE_URL not set")

    sources = yaml.safe_load(Path(args.seeds).read_text(encoding="utf-8"))["sources"]
    logger.info("Loaded %d bodies from %s", len(sources), args.seeds)

    with psycopg.connect(args.database_url) as conn:
        with conn.cursor() as cur:
            for s in sources:
                cur.execute(
                    """
                    INSERT INTO operating_bodies
                        (code, name, type, prefecture_code, homepage_url)
                    VALUES
                        (%(code)s, %(name)s, %(type)s, %(prefecture)s, %(url)s)
                    ON CONFLICT (code) DO UPDATE SET
                        name            = EXCLUDED.name,
                        type            = EXCLUDED.type,
                        prefecture_code = EXCLUDED.prefecture_code,
                        homepage_url    = EXCLUDED.homepage_url
                    """,
                    {
                        "code": s["code"],
                        "name": s["name"],
                        "type": s["type"],
                        "prefecture": s["prefecture"],
                        "url": s.get("url"),
                    },
                )
        conn.commit()

    logger.info("Done. Upserted %d operating bodies.", len(sources))


if __name__ == "__main__":
    main()
