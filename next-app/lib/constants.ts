import type { Category, Status, TargetAudience } from './types';

// 個人向け / 事業者向け タブ — 「不明」「両方」はどちらのタブにも出す扱い
export const AUDIENCE_TABS: { value: 'individual' | 'business'; label: string }[] = [
  { value: 'individual', label: '個人向け' },
  { value: 'business', label: '事業者向け' },
];

// audience タブ値 → DB の target_audience 値 (このいずれかなら該当タブに表示)。
// '不明' は両タブに出す — 未タグの既存データを取りこぼさないため。
export const AUDIENCE_MATCH: Record<'individual' | 'business', TargetAudience[]> = {
  individual: ['個人', '両方', '不明'],
  business: ['事業者', '両方', '不明'],
};

// カテゴリ — src/schema.py Category enum と一致
export const CATEGORIES: Category[] = [
  '子育て・教育',
  '住まい',
  '医療・健康',
  '高齢者・介護',
  '障害者支援',
  '就労・起業',
  'ひとり親・低所得',
  '環境',
  'その他',
];

// 一覧フィルタで使う状態 (「不明」は出さない)
export const STATUSES: Status[] = ['募集中', '予定', '通年', '終了'];

// 診断フォーム: 世帯区分 — /api/diagnose の DiagnoseSchema と一致
export const HOUSEHOLDS: { value: string; label: string }[] = [
  { value: 'single', label: '単身' },
  { value: 'couple', label: '夫婦のみ' },
  { value: 'family_young', label: '子育て世帯（未就学児）' },
  { value: 'family_school', label: '子育て世帯（就学児）' },
  { value: 'single_parent', label: 'ひとり親世帯' },
  { value: 'elderly', label: '高齢者世帯' },
];

// 診断フォーム: 関心テーマ — /api/diagnose の catMap キーと一致
export const INTERESTS: { value: string; label: string }[] = [
  { value: 'childcare', label: '子育て・教育' },
  { value: 'housing', label: '住まい' },
  { value: 'medical', label: '医療・健康' },
  { value: 'employment', label: '就労・起業' },
  { value: 'environment', label: '環境' },
  { value: 'elderly', label: '高齢者・介護' },
];
