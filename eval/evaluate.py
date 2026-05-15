"""
精度評価スクリプト v0.3

Ground Truth と抽出結果を突き合わせ:
  - Recall (再現率)
  - フィールド別 Precision
  - カテゴリ別精度
  - 給付形態別精度

Usage:
    python -m eval.evaluate --truth eval/ground_truth.json --extracted data/extracted
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path


SCORED_FIELDS = [
    "program_name",
    "operating_body",
    "category",
    "subcategory",
    "benefit_type",         # v0.2
    "benefit_amount_max_yen",
    "benefit_rate_percent", # v0.3
    "application_window_type",  # v0.2
    "application_method",
    "status",
    "selection_quota",      # v0.3
]


def normalize(value):
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        return s if s else None
    return value


def field_match(expected, actual, tolerance=0.0):
    """Compare expected vs actual. Numeric values allow tolerance.

    Returns: (match: bool, partial_credit: float in [0,1])
    """
    e, a = normalize(expected), normalize(actual)
    if e is None and a is None:
        return True, 1.0
    if e is None or a is None:
        return False, 0.0
    # Numeric: allow tolerance
    if isinstance(e, (int, float)) and isinstance(a, (int, float)):
        if e == a:
            return True, 1.0
        # Partial credit if within 10%
        diff = abs(e - a) / max(abs(e), 1)
        return False, max(0.0, 1.0 - diff * 5)
    # String: case+space insensitive
    if isinstance(e, str) and isinstance(a, str):
        e_n = e.replace(" ", "").replace("　", "").lower()
        a_n = a.replace(" ", "").replace("　", "").lower()
        if e_n == a_n:
            return True, 1.0
        # Partial credit if one contains the other
        if e_n in a_n or a_n in e_n:
            return False, 0.5
    return e == a, 1.0 if e == a else 0.0


def load_extracted(extracted_dir: Path) -> dict[str, dict]:
    """source_url + program_name をキーにした dict を返す。"""
    by_key: dict[str, dict] = {}
    for p in extracted_dir.rglob("*.json"):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        for sub in data.get("subsidies", []):
            url = sub.get("source_url", "")
            name = sub.get("program_name", "")
            by_key[f"{url}#{name}"] = sub
            # Also index by URL only for fallback matching
            by_key[url] = sub
    return by_key


def bar(value, width=20):
    filled = int(value * width)
    return "█" * filled + "░" * (width - filled)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--truth", required=True)
    p.add_argument("--extracted", required=True)
    p.add_argument("--verbose", "-v", action="store_true")
    args = p.parse_args()

    truths = json.loads(Path(args.truth).read_text(encoding="utf-8"))
    extracted = load_extracted(Path(args.extracted))

    found = 0
    missed = []
    field_correct = defaultdict(float)  # weighted (allows partial credit)
    field_total = defaultdict(int)
    cat_correct = defaultdict(lambda: defaultdict(float))
    cat_total = defaultdict(lambda: defaultdict(int))

    for gt in truths:
        url = gt.get("source_url", "")
        name = gt.get("program_name", "")
        key = f"{url}#{name}"
        match = extracted.get(key) or extracted.get(url)

        if not match:
            missed.append(gt.get("program_name"))
            continue

        found += 1
        category = gt.get("category", "unknown")
        for f in SCORED_FIELDS:
            if f not in gt or gt[f] is None:
                continue  # skip fields not in GT
            field_total[f] += 1
            cat_total[category][f] += 1
            ok, partial = field_match(gt[f], match.get(f))
            credit = 1.0 if ok else partial
            field_correct[f] += credit
            cat_correct[category][f] += credit
            if args.verbose and not ok:
                print(f"  [MISS] {gt['program_name'][:40]}: {f}")
                print(f"         expected: {gt[f]!r}")
                print(f"         actual:   {match.get(f)!r}")

    total = len(truths)

    print("=" * 60)
    print("  Tokyo Subsidy Extractor — 精度評価レポート")
    print("=" * 60)
    print()
    print(f"Ground Truth: {total}件")
    print(f"Extracted:    {len(extracted)//2}件 (一意URL基準)")
    print()
    recall = found / total if total > 0 else 0
    print(f"【再現率 Recall】 {found}/{total} = {recall:.1%}  {bar(recall)}")

    if missed:
        print()
        print(f"未抽出 ({len(missed)}件):")
        for m in missed[:10]:
            print(f"  - {m}")

    print()
    print("【フィールド別精度】 (抽出できた制度のうち)")
    print("-" * 60)
    for f in SCORED_FIELDS:
        if field_total[f] == 0:
            continue
        acc = field_correct[f] / field_total[f]
        print(f"  {f:30s} {acc:>6.1%}  {bar(acc)}  (n={field_total[f]})")

    print()
    print("【カテゴリ別 平均精度】")
    print("-" * 60)
    for cat in sorted(cat_total.keys()):
        total_score = sum(cat_correct[cat].values())
        total_count = sum(cat_total[cat].values())
        if total_count == 0:
            continue
        acc = total_score / total_count
        print(f"  {cat:20s} {acc:>6.1%}  {bar(acc)}  (n={total_count} fields)")

    print()
    print("【目標値との比較】")
    print("-" * 60)
    targets = [
        ("再現率",                                   recall,        0.85),
        ("制度名",                                   field_correct.get("program_name",0)/max(field_total.get("program_name",1),1),  0.99),
        ("カテゴリ分類",                              field_correct.get("category",0)/max(field_total.get("category",1),1),         0.95),
        ("金額抽出",                                 field_correct.get("benefit_amount_max_yen",0)/max(field_total.get("benefit_amount_max_yen",1),1), 0.90),
        ("状態判定",                                 field_correct.get("status",0)/max(field_total.get("status",1),1),               0.95),
    ]
    for label, actual, target in targets:
        gap = actual - target
        mark = "✓" if gap >= 0 else "✗"
        print(f"  {mark} {label:20s} {actual:>6.1%}  目標 {target:.0%}  差 {gap:+.1%}")

    print()
    print("=" * 60)


if __name__ == "__main__":
    main()
