// ============================================================
// サーバーコンポーネント用のデータ取得層
// API ルート (/api/subsidies) と同じ SQL をここに集約する。
// ============================================================
import { sql } from './db';
import { AUDIENCE_MATCH } from './constants';
import type { Subsidy } from './types';

export type Audience = 'individual' | 'business';

export interface SubsidyFilters {
  category?: string;
  body?: string;
  status?: string;
  q?: string;
  audience?: Audience;
  verifiedOnly?: boolean; // true なら verified=true のみ
  limit?: number;
  cursor?: number;
}

/** 一覧取得。フィルタ未指定時は募集中・予定・通年のみ。締切が近い順。 */
export async function getSubsidies(
  filters: SubsidyFilters = {},
): Promise<Subsidy[]> {
  const {
    category, body, status, q, audience, verifiedOnly, limit = 50, cursor = 0,
  } = filters;

  // route.ts と同様、postgres.js のフラグメント型は any で受ける
  const conditions: any[] = [];
  if (category) conditions.push(sql`s.category = ${category}`);
  if (body) conditions.push(sql`ob.code = ${body}`);
  if (audience)
    conditions.push(sql`s.target_audience = ANY(${AUDIENCE_MATCH[audience]})`);
  if (verifiedOnly) conditions.push(sql`s.verified = true`);
  if (status) conditions.push(sql`s.status = ${status}`);
  else conditions.push(sql`s.status IN ('募集中', '予定', '通年')`);
  if (q)
    conditions.push(
      sql`(s.program_name ILIKE ${'%' + q + '%'} OR s.plain_summary ILIKE ${'%' + q + '%'})`,
    );
  if (cursor) conditions.push(sql`s.id > ${cursor}`);

  const whereClause = sql`WHERE ${conditions.reduce((acc, c, i) =>
    i === 0 ? c : sql`${acc} AND ${c}`,
  )}`;

  return sql<Subsidy[]>`
    SELECT
      s.*,
      ob.code AS body_code,
      ob.name AS body_name,
      ob.type AS body_type,
      ob.prefecture_code AS body_prefecture,
      (SELECT json_agg(row_to_json(ar)) FROM application_rounds ar WHERE ar.subsidy_id = s.id) AS application_rounds,
      (SELECT json_agg(row_to_json(sr)) FROM subsidy_relations sr WHERE sr.subsidy_id = s.id) AS related_programs,
      (SELECT json_agg(row_to_json(bt)) FROM benefit_tiers bt WHERE bt.subsidy_id = s.id) AS benefit_tiers,
      (SELECT json_agg(row_to_json(gi)) FROM goods_items gi WHERE gi.subsidy_id = s.id) AS goods_items
    FROM subsidies s
    JOIN operating_bodies ob ON s.operating_body_id = ob.id
    ${whereClause}
    ORDER BY
      CASE WHEN s.application_end IS NULL THEN 1 ELSE 0 END,
      s.application_end ASC NULLS LAST,
      s.id DESC
    LIMIT ${limit}
  `;
}

/** 詳細取得。存在しなければ null。 */
export async function getSubsidyById(id: number): Promise<Subsidy | null> {
  const rows = await sql<Subsidy[]>`
    SELECT
      s.*,
      ob.code AS body_code,
      ob.name AS body_name,
      ob.type AS body_type,
      ob.prefecture_code AS body_prefecture,
      (SELECT json_agg(row_to_json(ar)) FROM application_rounds ar WHERE ar.subsidy_id = s.id) AS application_rounds,
      (SELECT json_agg(row_to_json(sr)) FROM subsidy_relations sr WHERE sr.subsidy_id = s.id) AS related_programs,
      (SELECT json_agg(row_to_json(bt)) FROM benefit_tiers bt WHERE bt.subsidy_id = s.id) AS benefit_tiers,
      (SELECT json_agg(row_to_json(gi)) FROM goods_items gi WHERE gi.subsidy_id = s.id) AS goods_items
    FROM subsidies s
    JOIN operating_bodies ob ON s.operating_body_id = ob.id
    WHERE s.id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export interface CategoryCount {
  category: string;
  count: number;
}

/** カテゴリ別の件数 (募集中・予定・通年のみ)。トップページのナビ用。 */
export async function getCategoryCounts(
  audience?: Audience,
): Promise<CategoryCount[]> {
  const audienceClause = audience
    ? sql`AND target_audience = ANY(${AUDIENCE_MATCH[audience]})`
    : sql``;
  return sql<CategoryCount[]>`
    SELECT category, COUNT(*)::int AS count
    FROM subsidies
    WHERE status IN ('募集中', '予定', '通年')
    ${audienceClause}
    GROUP BY category
    ORDER BY count DESC
  `;
}

/** 自治体 code → 掲載制度数 (募集中・予定・通年のみ)。地域ナビ用。 */
export async function getBodySubsidyCounts(
  audience?: Audience,
): Promise<Map<string, number>> {
  const audienceClause = audience
    ? sql`AND s.target_audience = ANY(${AUDIENCE_MATCH[audience]})`
    : sql``;
  const rows = await sql<{ body_code: string; count: number }[]>`
    SELECT ob.code AS body_code, COUNT(*)::int AS count
    FROM subsidies s
    JOIN operating_bodies ob ON s.operating_body_id = ob.id
    WHERE s.status IN ('募集中', '予定', '通年')
    ${audienceClause}
    GROUP BY ob.code
  `;
  return new Map(rows.map((r) => [r.body_code, r.count]));
}
