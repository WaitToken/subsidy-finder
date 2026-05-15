"""
PoC ランナー

シードURL → リンク発見 → 各ページ取得 → LLM抽出 → JSON保存
の一連の流れを実行する。

Usage:
    # 単一URLでテスト
    python -m src.run --url "https://www.city.shinjuku.lg.jp/..."

    # シードファイルから全体実行 (5自治体のみ)
    python -m src.run --seeds data/seeds.yaml --limit-sources 5 --limit-pages-per-source 10

    # フル実行
    python -m src.run --seeds data/seeds.yaml
"""
import argparse
import logging
from pathlib import Path

import yaml

from .crawler import Crawler
from .extractor import extract_from_page, save_result

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("run")


def run_single(url: str, out_dir: Path):
    """1URLだけ処理 (デバッグ用)。"""
    with Crawler() as crawler:
        page = crawler.fetch(url)
        if not page or not page["content"]:
            logger.error("Failed to fetch or empty content: %s", url)
            return
        logger.info("Fetched %d chars from %s", len(page["content"]), url)

        result = extract_from_page(
            url=page["url"],
            title=page["title"],
            content=page["content"],
            fetched_at=page["fetched_at"],
        )
        path = save_result(result, out_dir, page["url"])
        logger.info(
            "Extracted %d subsidies (page_was_subsidy_page=%s) → %s",
            len(result.subsidies),
            result.page_was_a_subsidy_page,
            path,
        )


def run_from_seeds(
    seeds_file: Path,
    out_dir: Path,
    limit_sources: int | None = None,
    limit_pages_per_source: int = 20,
    skip_sources: int = 0,
    discover_depth: int = 2,
):
    sources = yaml.safe_load(seeds_file.read_text(encoding="utf-8"))["sources"]
    # skip_sources: 既に処理済みのソースを先頭から飛ばす (バッチ実行用)
    if skip_sources:
        sources = sources[skip_sources:]
    if limit_sources:
        sources = sources[:limit_sources]

    with Crawler() as crawler:
        for src in sources:
            logger.info("=== Processing %s ===", src["name"])
            links = crawler.discover(
                src["url"],
                max_links=limit_pages_per_source,
                depth=discover_depth,
            )
            logger.info("Found %d candidate pages for %s", len(links), src["name"])

            source_out = out_dir / src["name"]
            for link in links:
                page = crawler.fetch(link)
                if not page or not page["content"]:
                    continue
                if len(page["content"]) < 200:
                    # 中身がほぼ無いページはスキップ
                    continue
                try:
                    result = extract_from_page(
                        url=page["url"],
                        title=page["title"],
                        content=page["content"],
                        fetched_at=page["fetched_at"],
                    )
                except Exception as e:
                    logger.warning("Extraction failed for %s: %s", link, e)
                    continue

                if not result.page_was_a_subsidy_page or not result.subsidies:
                    continue
                save_result(result, source_out, page["url"])
                logger.info(
                    "  ✓ %s → %d subsidies",
                    page["title"][:60],
                    len(result.subsidies),
                )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--url", help="単一URLを処理 (デバッグ用)")
    p.add_argument("--seeds", help="シードYAMLのパス")
    p.add_argument("--out", default="data/extracted", help="出力ディレクトリ")
    p.add_argument("--limit-sources", type=int, default=None)
    p.add_argument("--limit-pages-per-source", type=int, default=20)
    p.add_argument("--skip-sources", type=int, default=0,
                   help="先頭から飛ばすソース数 (バッチ実行用)")
    p.add_argument("--discover-depth", type=int, default=2,
                   help="リンク探索の深さ。1=直下のみ, 2=カテゴリを1段たどる")
    args = p.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.url:
        run_single(args.url, out_dir)
    elif args.seeds:
        run_from_seeds(
            seeds_file=Path(args.seeds),
            out_dir=out_dir,
            limit_sources=args.limit_sources,
            limit_pages_per_source=args.limit_pages_per_source,
            skip_sources=args.skip_sources,
            discover_depth=args.discover_depth,
        )
    else:
        p.error("Provide --url or --seeds")


if __name__ == "__main__":
    main()
