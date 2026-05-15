"""
next-app/lib/bodies.ts を data/seeds.yaml から再生成する。

自治体マスタの single source of truth は data/seeds.yaml。
クライアントコンポーネント (Filters / DiagnoseForm) は DB を直接引けないため、
ビルド前にこのスクリプトで静的な TypeScript データへ展開する。

Usage:
    python scripts/gen_bodies.py
"""
import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SEEDS = ROOT / "data" / "seeds.yaml"
OUT = ROOT / "next-app" / "lib" / "bodies.ts"

HEADER = """\
// ============================================================
// 自治体マスタ — このファイルは自動生成です。直接編集しないこと。
// 生成元: data/seeds.yaml  /  生成: python scripts/gen_bodies.py
// ============================================================

export type BodyType =
  | 'prefecture' | 'designated_city' | 'ward' | 'city' | 'town' | 'village'
  | 'national_government' | 'national_agency' | 'foundation';

const NATIONAL_TYPES: ReadonlySet<BodyType> = new Set([
  'national_government', 'national_agency', 'foundation',
]);

export interface Body {
  code: string;
  name: string;
  type: BodyType;
  prefecture: string | null; // 所属都道府県の code。国・全国系は null
}
"""

FOOTER = """\

export const PREFECTURES: Body[] = BODIES.filter((b) => b.type === 'prefecture');

/** 国・全国系 (省庁・国の機関・公益財団など) */
export const NATIONAL_BODIES: Body[] = BODIES.filter((b) =>
  NATIONAL_TYPES.has(b.type),
);

export interface PrefectureGroup {
  prefecture: Body;
  members: Body[]; // その都道府県に属する政令市・特別区など
}

// 都道府県でグループ化した一覧 (グループ化セレクト用)
export const PREFECTURE_GROUPS: PrefectureGroup[] = PREFECTURES.map((pref) => ({
  prefecture: pref,
  members: BODIES.filter(
    (b) => b.prefecture === pref.code && b.type !== 'prefecture',
  ),
}));

const NAME_BY_CODE = new Map(BODIES.map((b) => [b.code, b.name] as const));
const PREFECTURE_BY_CODE = new Map(
  BODIES.map((b) => [b.code, b.prefecture] as const),
);

export function bodyName(code: string): string {
  return NAME_BY_CODE.get(code) ?? code;
}

/** 自治体 code → 所属都道府県の code。国系・未知の code は null。 */
export function bodyPrefecture(code: string): string | null {
  return PREFECTURE_BY_CODE.get(code) ?? null;
}

/** 国・全国系か判定。診断ロジックなどで使う。 */
export function isNationalBody(code: string): boolean {
  const b = BODIES.find((b) => b.code === code);
  return b != null && NATIONAL_TYPES.has(b.type);
}
"""


def main() -> None:
    sources = yaml.safe_load(SEEDS.read_text(encoding="utf-8"))["sources"]
    rows = []
    for s in sources:
        body = {
            "code": s["code"],
            "name": s["name"],
            "type": s["type"],
            "prefecture": s["prefecture"],
        }
        rows.append("  " + json.dumps(body, ensure_ascii=False) + ",")

    body_array = "\nexport const BODIES: Body[] = [\n" + "\n".join(rows) + "\n];\n"
    OUT.write_text(HEADER + body_array + FOOTER, encoding="utf-8")
    print(f"Wrote {len(sources)} bodies to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
