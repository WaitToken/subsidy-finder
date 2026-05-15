import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { bodyPrefecture } from '@/lib/bodies';
import type { Subsidy, DiagnoseResult, DiagnoseRequest } from '@/lib/types';

// ============================================================
// Schema validation
// ============================================================
const DiagnoseSchema = z.object({
  ward:        z.string().optional(),
  household:   z.enum(['single', 'couple', 'family_young', 'family_school', 'single_parent', 'elderly']).optional(),
  age:         z.number().int().min(0).max(120).optional(),
  child_age:   z.number().int().min(0).max(25).optional(),
  interests:   z.array(z.string()).optional(),
});

// ============================================================
// Match score logic
// ============================================================
// 同じロジックを front-end と共有するため、純粋関数として切り出す
function calcScore(s: Subsidy, dx: DiagnoseRequest): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. 自治体マッチ (40 pts)
  //    選択自治体そのもの、またはその所属都道府県 (広域) の制度がヒット
  if (dx.ward) {
    const userPref = bodyPrefecture(dx.ward);
    if (s.body_code === dx.ward) {
      score += 40;
      reasons.push(`${s.body_name}の制度`);
    } else if (
      s.body_type === 'prefecture' &&
      userPref != null &&
      s.body_prefecture === userPref
    ) {
      score += 40;
      reasons.push(`${s.body_name}（広域）の制度`);
    }
  }

  // 2. Household match (30 pts)
  if (dx.household) {
    const hhMap: Record<string, string[]> = {
      family_young: ['子育て世帯', '妊婦', '若者夫婦世帯'],
      family_school: ['子育て世帯'],
      single_parent: ['ひとり親世帯'],
      elderly: ['高齢者世帯'],
      couple: ['夫婦', '若者夫婦世帯'],
      single: [],
    };
    const expected = hhMap[dx.household] || [];
    if (s.target_household.some(h => expected.includes(h))) {
      score += 30;
      reasons.push('家族構成が合致');
    }
  }

  // 3. Age range (15 pts main + 20 pts child)
  if (dx.age != null && s.target_age_min != null) {
    if (s.target_age_min <= dx.age && (s.target_age_max == null || dx.age <= s.target_age_max)) {
      score += 15;
    }
  }
  if (dx.child_age != null && s.target_age_min != null && dx.household?.startsWith('family')) {
    if (s.target_age_min <= dx.child_age && (s.target_age_max == null || dx.child_age <= s.target_age_max)) {
      score += 20;
      reasons.push(`お子さん${dx.child_age}歳が対象`);
    }
  }

  // 4. Interest match (15 pts)
  if (dx.interests?.length) {
    const catMap: Record<string, string> = {
      childcare: '子育て・教育', housing: '住まい', medical: '医療・健康',
      employment: '就労・起業', environment: '環境', elderly: '高齢者・介護',
    };
    const expandedInterests = dx.interests.map(i => catMap[i] || i);
    if (expandedInterests.includes(s.category)) {
      score += 15;
      reasons.push('関心テーマと一致');
    }
  }

  return { score, reasons };
}

// ============================================================
// POST /api/diagnose
// ============================================================
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = DiagnoseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', detail: parsed.error.format() }, { status: 400 });
  }
  const dx = parsed.data;

  // Pre-filter at DB level for performance:
  //   - active subsidies only
  //   - ward match (if specified)
  //   - interest categories (if specified)
  const conditions: any[] = [sql`s.status IN ('募集中', '予定', '通年')`];
  if (dx.ward) {
    // 選択自治体 + その所属都道府県 (広域) の制度に絞り込む
    const userPref = bodyPrefecture(dx.ward);
    conditions.push(
      sql`(ob.code = ${dx.ward} OR (ob.type = 'prefecture' AND ob.prefecture_code = ${userPref}))`,
    );
  }
  if (dx.interests?.length) {
    const catMap: Record<string, string> = {
      childcare: '子育て・教育', housing: '住まい', medical: '医療・健康',
      employment: '就労・起業', environment: '環境', elderly: '高齢者・介護',
    };
    const cats = dx.interests.map(i => catMap[i] || i);
    conditions.push(sql`s.category = ANY(${cats})`);
  }

  const whereClause = sql`WHERE ${conditions.reduce((acc, c, i) => i === 0 ? c : sql`${acc} AND ${c}`)}`;

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
    LIMIT 200
  `;

  // Score in application layer
  const scored: DiagnoseResult[] = rows
    .map(s => {
      const { score, reasons } = calcScore(s, dx);
      return { subsidy: s, match_score: score, match_reasons: reasons };
    })
    .filter(r => r.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score);

  return NextResponse.json({
    matched: scored.filter(r => r.match_score >= 30),
    partial: scored.filter(r => r.match_score > 0 && r.match_score < 30),
    total_evaluated: rows.length,
  });
}
