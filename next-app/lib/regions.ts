// ============================================================
// 地方区分 — 都道府県を地域でグループ化する (地域ナビ用)
// prefecture code は lib/bodies.ts と一致させること
// ============================================================
export interface Region {
  name: string;
  prefectures: string[]; // prefecture code の配列
}

export const REGIONS: Region[] = [
  {
    name: '北海道・東北',
    prefectures: [
      'hokkaido', 'aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima',
    ],
  },
  {
    name: '関東',
    prefectures: [
      'ibaraki', 'tochigi', 'gunma', 'saitama', 'chiba', 'tokyo', 'kanagawa',
    ],
  },
  {
    name: '中部',
    prefectures: [
      'niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano',
      'gifu', 'shizuoka', 'aichi',
    ],
  },
  {
    name: '近畿',
    prefectures: [
      'mie', 'shiga', 'kyoto', 'osaka', 'hyogo', 'nara', 'wakayama',
    ],
  },
  {
    name: '中国',
    prefectures: ['tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi'],
  },
  {
    name: '四国',
    prefectures: ['tokushima', 'kagawa', 'ehime', 'kochi'],
  },
  {
    name: '九州・沖縄',
    prefectures: [
      'fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki',
      'kagoshima', 'okinawa',
    ],
  },
];

const REGION_BY_PREFECTURE = new Map<string, string>(
  REGIONS.flatMap((r) => r.prefectures.map((p) => [p, r.name] as const)),
);

/** 都道府県 code → 地方名。未知は null。 */
export function regionOf(prefectureCode: string): string | null {
  return REGION_BY_PREFECTURE.get(prefectureCode) ?? null;
}
