// ============================================================
// Type definitions matching src/schema.py (Pydantic v0.4)
// ============================================================
import type { BodyType } from './bodies';

export type Category =
  | '子育て・教育' | '住まい' | '医療・健康' | '高齢者・介護'
  | '障害者支援'   | '就労・起業' | 'ひとり親・低所得' | '環境' | 'その他';

export type Status = '募集中' | '終了' | '予定' | '通年' | '不明';

export type TargetAudience = '個人' | '事業者' | '両方' | '不明';

export type BenefitType =
  | '現金' | 'ポイント・電子マネー' | '商品券・クーポン'
  | 'サービス提供' | '現物給付' | '複合' | '不明';

export type ApplicationWindowType =
  | '固定日付' | 'イベント基準' | '通年' | '予算枠まで' | '不明';

export type ApplicationMethod =
  | 'オンライン' | '郵送' | '窓口' | '複数' | '不明';

export type ProgramRelationType = '併用可能' | '前提' | '代替' | '関連';

export interface ApplicationRound {
  round_number: number;
  start_date: string | null;
  end_date: string | null;
  note: string | null;
}

export interface ProgramRelation {
  program_name: string;
  related_subsidy_id: number | null;
  relation_type: ProgramRelationType;
  note: string | null;
}

// ====== v0.4 ======
export type BenefitTierCondition =
  | '車種' | '所得区分' | '世帯人数' | '子の出生順'
  | '年齢区分' | '地域区分' | 'その他';

export interface BenefitTier {
  condition_type: BenefitTierCondition;
  condition_label: string;
  amount_yen: number | null;
  rate_percent: number | null;
  note: string | null;
}

export interface GoodsItem {
  item_name: string;
  quantity_note: string | null;
  stock_limited: boolean;
  note: string | null;
}

export interface Subsidy {
  id: number;
  program_name: string;
  body_code: string;
  body_name: string;
  body_type: BodyType;
  body_prefecture: string; // 実施主体の所属都道府県 code

  category: Category;
  subcategory: string | null;
  target_audience: TargetAudience;

  target_summary: string;
  target_age_min: number | null;
  target_age_max: number | null;
  target_household: string[];
  target_income_max_yen: number | null;
  target_residency_required: boolean;

  benefit_summary: string;
  benefit_type: BenefitType;
  benefit_amount_max_yen: number | null;
  benefit_rate_percent: number | null;
  eligible_expense_categories: string[] | null;
  selection_quota: number | null;
  benefit_tiers: BenefitTier[] | null;
  goods_items: GoodsItem[] | null;

  application_window_type: ApplicationWindowType | null;
  application_window_note: string | null;
  application_start: string | null;
  application_end: string | null;
  application_method: ApplicationMethod | null;
  required_documents: string[] | null;
  application_rounds: ApplicationRound[] | null;

  status: Status;
  status_note: string | null;

  contact: string | null;
  source_url: string;
  plain_summary: string;

  verified: boolean;
  extracted_at: string | null; // ISO 8601 (extraction_metadata.extracted_at 由来)
  related_programs: ProgramRelation[] | null;
}

// ============================================================
// Diagnose request/response
// ============================================================
export interface DiagnoseRequest {
  ward?: string;
  household?:
    | 'single' | 'couple' | 'family_young' | 'family_school'
    | 'single_parent' | 'elderly';
  age?: number;
  child_age?: number;
  // /api/diagnose は 'childcare' / 'housing' などのキーを受け取り、
  // 内部で Category へマッピングする (Category 値そのものではない)
  interests?: string[];
}

export interface DiagnoseResult {
  subsidy: Subsidy;
  match_score: number;       // 0-100
  match_reasons: string[];
}
