// ============================================================
// 自治体マスタ — このファイルは自動生成です。直接編集しないこと。
// 生成元: data/seeds.yaml  /  生成: python scripts/gen_bodies.py
// ============================================================

export type BodyType =
  | 'prefecture' | 'designated_city' | 'ward' | 'city' | 'town' | 'village';

export interface Body {
  code: string;
  name: string;
  type: BodyType;
  prefecture: string; // 所属都道府県の code
}

export const BODIES: Body[] = [
  {"code": "hokkaido", "name": "北海道", "type": "prefecture", "prefecture": "hokkaido"},
  {"code": "aomori", "name": "青森県", "type": "prefecture", "prefecture": "aomori"},
  {"code": "iwate", "name": "岩手県", "type": "prefecture", "prefecture": "iwate"},
  {"code": "miyagi", "name": "宮城県", "type": "prefecture", "prefecture": "miyagi"},
  {"code": "akita", "name": "秋田県", "type": "prefecture", "prefecture": "akita"},
  {"code": "yamagata", "name": "山形県", "type": "prefecture", "prefecture": "yamagata"},
  {"code": "fukushima", "name": "福島県", "type": "prefecture", "prefecture": "fukushima"},
  {"code": "ibaraki", "name": "茨城県", "type": "prefecture", "prefecture": "ibaraki"},
  {"code": "tochigi", "name": "栃木県", "type": "prefecture", "prefecture": "tochigi"},
  {"code": "gunma", "name": "群馬県", "type": "prefecture", "prefecture": "gunma"},
  {"code": "saitama", "name": "埼玉県", "type": "prefecture", "prefecture": "saitama"},
  {"code": "chiba", "name": "千葉県", "type": "prefecture", "prefecture": "chiba"},
  {"code": "tokyo", "name": "東京都", "type": "prefecture", "prefecture": "tokyo"},
  {"code": "kanagawa", "name": "神奈川県", "type": "prefecture", "prefecture": "kanagawa"},
  {"code": "niigata", "name": "新潟県", "type": "prefecture", "prefecture": "niigata"},
  {"code": "toyama", "name": "富山県", "type": "prefecture", "prefecture": "toyama"},
  {"code": "ishikawa", "name": "石川県", "type": "prefecture", "prefecture": "ishikawa"},
  {"code": "fukui", "name": "福井県", "type": "prefecture", "prefecture": "fukui"},
  {"code": "yamanashi", "name": "山梨県", "type": "prefecture", "prefecture": "yamanashi"},
  {"code": "nagano", "name": "長野県", "type": "prefecture", "prefecture": "nagano"},
  {"code": "gifu", "name": "岐阜県", "type": "prefecture", "prefecture": "gifu"},
  {"code": "shizuoka", "name": "静岡県", "type": "prefecture", "prefecture": "shizuoka"},
  {"code": "aichi", "name": "愛知県", "type": "prefecture", "prefecture": "aichi"},
  {"code": "mie", "name": "三重県", "type": "prefecture", "prefecture": "mie"},
  {"code": "shiga", "name": "滋賀県", "type": "prefecture", "prefecture": "shiga"},
  {"code": "kyoto", "name": "京都府", "type": "prefecture", "prefecture": "kyoto"},
  {"code": "osaka", "name": "大阪府", "type": "prefecture", "prefecture": "osaka"},
  {"code": "hyogo", "name": "兵庫県", "type": "prefecture", "prefecture": "hyogo"},
  {"code": "nara", "name": "奈良県", "type": "prefecture", "prefecture": "nara"},
  {"code": "wakayama", "name": "和歌山県", "type": "prefecture", "prefecture": "wakayama"},
  {"code": "tottori", "name": "鳥取県", "type": "prefecture", "prefecture": "tottori"},
  {"code": "shimane", "name": "島根県", "type": "prefecture", "prefecture": "shimane"},
  {"code": "okayama", "name": "岡山県", "type": "prefecture", "prefecture": "okayama"},
  {"code": "hiroshima", "name": "広島県", "type": "prefecture", "prefecture": "hiroshima"},
  {"code": "yamaguchi", "name": "山口県", "type": "prefecture", "prefecture": "yamaguchi"},
  {"code": "tokushima", "name": "徳島県", "type": "prefecture", "prefecture": "tokushima"},
  {"code": "kagawa", "name": "香川県", "type": "prefecture", "prefecture": "kagawa"},
  {"code": "ehime", "name": "愛媛県", "type": "prefecture", "prefecture": "ehime"},
  {"code": "kochi", "name": "高知県", "type": "prefecture", "prefecture": "kochi"},
  {"code": "fukuoka", "name": "福岡県", "type": "prefecture", "prefecture": "fukuoka"},
  {"code": "saga", "name": "佐賀県", "type": "prefecture", "prefecture": "saga"},
  {"code": "nagasaki", "name": "長崎県", "type": "prefecture", "prefecture": "nagasaki"},
  {"code": "kumamoto", "name": "熊本県", "type": "prefecture", "prefecture": "kumamoto"},
  {"code": "oita", "name": "大分県", "type": "prefecture", "prefecture": "oita"},
  {"code": "miyazaki", "name": "宮崎県", "type": "prefecture", "prefecture": "miyazaki"},
  {"code": "kagoshima", "name": "鹿児島県", "type": "prefecture", "prefecture": "kagoshima"},
  {"code": "okinawa", "name": "沖縄県", "type": "prefecture", "prefecture": "okinawa"},
  {"code": "sapporo-shi", "name": "札幌市", "type": "designated_city", "prefecture": "hokkaido"},
  {"code": "sendai-shi", "name": "仙台市", "type": "designated_city", "prefecture": "miyagi"},
  {"code": "saitama-shi", "name": "さいたま市", "type": "designated_city", "prefecture": "saitama"},
  {"code": "chiba-shi", "name": "千葉市", "type": "designated_city", "prefecture": "chiba"},
  {"code": "yokohama-shi", "name": "横浜市", "type": "designated_city", "prefecture": "kanagawa"},
  {"code": "kawasaki-shi", "name": "川崎市", "type": "designated_city", "prefecture": "kanagawa"},
  {"code": "sagamihara-shi", "name": "相模原市", "type": "designated_city", "prefecture": "kanagawa"},
  {"code": "niigata-shi", "name": "新潟市", "type": "designated_city", "prefecture": "niigata"},
  {"code": "shizuoka-shi", "name": "静岡市", "type": "designated_city", "prefecture": "shizuoka"},
  {"code": "hamamatsu-shi", "name": "浜松市", "type": "designated_city", "prefecture": "shizuoka"},
  {"code": "nagoya-shi", "name": "名古屋市", "type": "designated_city", "prefecture": "aichi"},
  {"code": "kyoto-shi", "name": "京都市", "type": "designated_city", "prefecture": "kyoto"},
  {"code": "osaka-shi", "name": "大阪市", "type": "designated_city", "prefecture": "osaka"},
  {"code": "sakai-shi", "name": "堺市", "type": "designated_city", "prefecture": "osaka"},
  {"code": "kobe-shi", "name": "神戸市", "type": "designated_city", "prefecture": "hyogo"},
  {"code": "okayama-shi", "name": "岡山市", "type": "designated_city", "prefecture": "okayama"},
  {"code": "hiroshima-shi", "name": "広島市", "type": "designated_city", "prefecture": "hiroshima"},
  {"code": "kitakyushu-shi", "name": "北九州市", "type": "designated_city", "prefecture": "fukuoka"},
  {"code": "fukuoka-shi", "name": "福岡市", "type": "designated_city", "prefecture": "fukuoka"},
  {"code": "kumamoto-shi", "name": "熊本市", "type": "designated_city", "prefecture": "kumamoto"},
  {"code": "chiyoda", "name": "千代田区", "type": "ward", "prefecture": "tokyo"},
  {"code": "chuo", "name": "中央区", "type": "ward", "prefecture": "tokyo"},
  {"code": "minato", "name": "港区", "type": "ward", "prefecture": "tokyo"},
  {"code": "shinjuku", "name": "新宿区", "type": "ward", "prefecture": "tokyo"},
  {"code": "bunkyo", "name": "文京区", "type": "ward", "prefecture": "tokyo"},
  {"code": "taito", "name": "台東区", "type": "ward", "prefecture": "tokyo"},
  {"code": "sumida", "name": "墨田区", "type": "ward", "prefecture": "tokyo"},
  {"code": "koto", "name": "江東区", "type": "ward", "prefecture": "tokyo"},
  {"code": "shinagawa", "name": "品川区", "type": "ward", "prefecture": "tokyo"},
  {"code": "meguro", "name": "目黒区", "type": "ward", "prefecture": "tokyo"},
  {"code": "ota", "name": "大田区", "type": "ward", "prefecture": "tokyo"},
  {"code": "setagaya", "name": "世田谷区", "type": "ward", "prefecture": "tokyo"},
  {"code": "shibuya", "name": "渋谷区", "type": "ward", "prefecture": "tokyo"},
  {"code": "nakano", "name": "中野区", "type": "ward", "prefecture": "tokyo"},
  {"code": "suginami", "name": "杉並区", "type": "ward", "prefecture": "tokyo"},
  {"code": "toshima", "name": "豊島区", "type": "ward", "prefecture": "tokyo"},
  {"code": "kita", "name": "北区", "type": "ward", "prefecture": "tokyo"},
  {"code": "arakawa", "name": "荒川区", "type": "ward", "prefecture": "tokyo"},
  {"code": "itabashi", "name": "板橋区", "type": "ward", "prefecture": "tokyo"},
  {"code": "nerima", "name": "練馬区", "type": "ward", "prefecture": "tokyo"},
  {"code": "adachi", "name": "足立区", "type": "ward", "prefecture": "tokyo"},
  {"code": "katsushika", "name": "葛飾区", "type": "ward", "prefecture": "tokyo"},
  {"code": "edogawa", "name": "江戸川区", "type": "ward", "prefecture": "tokyo"},
];

export const PREFECTURES: Body[] = BODIES.filter((b) => b.type === 'prefecture');

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

/** 自治体 code → 所属都道府県の code。未知の code は null。 */
export function bodyPrefecture(code: string): string | null {
  return PREFECTURE_BY_CODE.get(code) ?? null;
}
