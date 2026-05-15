import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Subsidy } from '@/lib/types';

/**
 * GET /api/subsidies/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const subsidyId = parseInt(id);
  if (isNaN(subsidyId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

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
    WHERE s.id = ${subsidyId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}
