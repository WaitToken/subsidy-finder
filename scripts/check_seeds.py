"""seeds.yaml の url 疎通を一括検証する。

Usage: python scripts/check_seeds.py
"""
import sys
from concurrent.futures import ThreadPoolExecutor

import httpx
import yaml

UA = "TokyoSubsidyBot/0.3 (PoC seed check)"


def check(entry: dict) -> tuple[str, str, str]:
    url = entry["url"]
    try:
        r = httpx.get(url, headers={"User-Agent": UA}, timeout=15.0,
                      follow_redirects=True)
        return entry["code"], str(r.status_code), str(r.url)
    except Exception as e:
        return entry["code"], "ERR", f"{type(e).__name__}: {e}"


def main() -> None:
    data = yaml.safe_load(open("data/seeds.yaml", encoding="utf-8"))
    sources = data["sources"]
    bad = []
    with ThreadPoolExecutor(max_workers=10) as ex:
        for code, status, final in ex.map(check, sources):
            ok = status == "200"
            if not ok:
                bad.append((code, status, final))
            mark = "  " if ok else "NG"
            print(f"{mark} {code:18s} {status:4s} {final}")
    print(f"\n{len(sources)} checked, {len(bad)} need attention")
    for code, status, final in bad:
        print(f"  - {code}: {status} {final}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
