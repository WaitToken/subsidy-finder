import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { AUDIENCE_MATCH } from '@/lib/constants';
import type { Subsidy } from '@/lib/types';

/**
 * GET /api/subsidies
 *
 * Query parameters:
 *   - category:    filter by category (e.g., 'housing')
 *   - body:        filter by operating body code (e.g., 'setagaya')
 *   - status:      filter by status (default: 募集中,予定,通年)
 *   - q:           full-text search on plain_summary + program_name
 *   - limit:       max results (default 50)
 *   - cursor:      pagination cursor (last seen id)
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const category = params.get('category');
  const body = params.get('body');
  const status = params.get('status');
  const q = params.get('q');
  const audience = params.get('audience'); // 'individual' | 'business'
  const verifiedOnly = params.get('verified') === 'true';
  const limit = Math.min(parseInt(params.get('limit') || '50'), 100);
  const cursor = parseInt(params.get('cursor') || '0');

  const conditions: any[] = [];
  if (category) conditions.push(sql`s.category = ${category}`);
  if (body)     conditions.push(sql`ob.code = ${body}`);
  if (audience === 'individual' || audience === 'business')
    conditions.push(sql`s.target_audience = ANY(${AUDIENCE_MATCH[audience]})`);
  if (verifiedOnly) conditions.push(sql`s.verified = true`);
  if (status)   conditions.push(sql`s.status = ${status}`);
  else          conditions.push(sql`s.status IN ('募集中', '予定', '通年')`);
  if (q)        conditions.push(sql`(s.program_name ILIKE ${'%' + q + '%'} OR s.plain_summary ILIKE ${'%' + q + '%'})`);
  if (cursor)   conditions.push(sql`s.id > ${cursor}`);

  const whereClause = conditions.length > 0
    ? sql`WHERE ${conditions.reduce((acc, c, i) => i === 0 ? c : sql`${acc} AND ${c}`)}`
    : sql``;

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
    ${whereClause}
    ORDER BY
      CASE WHEN s.application_end IS NULL THEN 1 ELSE 0 END,  -- 締切ありを先に
      s.application_end ASC NULLS LAST,                         -- 締切が近いものを上に
      s.id DESC
    LIMIT ${limit}
  `;

  const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;

  return NextResponse.json({
    subsidies: rows,
    next_cursor: nextCursor,
    count: rows.length,
  });
}
