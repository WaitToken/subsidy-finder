import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  StatusBadge,
  CategoryBadge,
  BenefitTypeBadge,
  AudienceBadge,
} from '@/components/Badge';
import { DbNotice } from '@/components/DbNotice';
import { getSubsidyById } from '@/lib/queries';
import type { Subsidy } from '@/lib/types';
import { formatYen, formatDate, deadlineLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** 定義リストの1行。値が空ならレンダリングしない。 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '' || (Array.isArray(children) && children.length === 0)) {
    return null;
  }
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-line py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-subink">{label}</dt>
      <dd className="text-sm leading-relaxed text-ink">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="section-rule font-serif text-lg">{title}</h2>
      <dl className="mt-3">{children}</dl>
    </section>
  );
}

export default async function SubsidyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  let subsidy: Subsidy | null;
  try {
    subsidy = await getSubsidyById(numericId);
  } catch (err) {
    return (
      <DbNotice detail={err instanceof Error ? err.message : String(err)} />
    );
  }
  if (!subsidy) notFound();

  const s = subsidy;
  const amount = formatYen(s.benefit_amount_max_yen);
  const income = formatYen(s.target_income_max_yen);

  return (
    <article>
      <Link href="/subsidies" className="text-sm text-accent hover:underline">
        ← 制度一覧へ戻る
      </Link>

      {/* ヘッダー */}
      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-subink">{s.body_name}</span>
          <AudienceBadge audience={s.target_audience} />
          <CategoryBadge category={s.category} />
          {s.subcategory && (
            <span className="text-xs text-subink">/ {s.subcategory}</span>
          )}
          <StatusBadge status={s.status} />
          {s.verified ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
              ✓ 人手確認済み
            </span>
          ) : (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
              自動収集（未確認）
            </span>
          )}
        </div>
        <h1 className="mt-3 font-serif text-2xl leading-snug sm:text-3xl">
          {s.program_name}
        </h1>
        <p className="mt-4 rounded-md bg-panel p-4 leading-relaxed text-ink">
          {s.plain_summary}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {amount && (
            <span className="font-serif text-xl text-accent">最大 {amount}</span>
          )}
          <BenefitTypeBadge benefitType={s.benefit_type} />
          {s.benefit_rate_percent != null && (
            <span className="text-sm text-subink">
              補助率 {s.benefit_rate_percent}%
            </span>
          )}
          {s.status === '募集中' && s.application_end && (
            <span className="text-sm text-subink">
              締切 {deadlineLabel(s.application_end)}
            </span>
          )}
          {s.extracted_at && (
            <span className="text-sm text-subink">
              更新 {formatDate(s.extracted_at)}
            </span>
          )}
        </div>
      </header>

      {/* 出典確認のお願い (β期間中は特に重要) */}
      <aside className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-bold text-amber-900">
          申請前に必ず公式情報をご確認ください
        </p>
        <p className="mt-1 text-amber-800">
          このページは {s.body_name} の公式サイトを構造化したものです。
          金額・期限・対象条件は変更されている可能性があります。最新情報は
          <a
            href={s.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 break-all underline hover:no-underline"
          >
            出典ページ ↗
          </a>
          {' '}でご確認ください。
        </p>
      </aside>

      {/* 対象者 */}
      <Section title="対象者">
        <Row label="対象">{s.target_summary}</Row>
        <Row label="年齢">
          {s.target_age_min != null || s.target_age_max != null
            ? `${s.target_age_min ?? ''}〜${s.target_age_max ?? ''}歳`
            : null}
        </Row>
        <Row label="世帯">
          {s.target_household.length > 0 ? s.target_household.join('、') : null}
        </Row>
        <Row label="所得上限">{income}</Row>
        <Row label="区内在住要件">
          {s.target_residency_required ? '必要' : '不要'}
        </Row>
      </Section>

      {/* 支援内容 */}
      <Section title="支援内容">
        <Row label="内容">{s.benefit_summary}</Row>
        <Row label="給付形態">{s.benefit_type}</Row>
        <Row label="最大支給額">{amount}</Row>
        <Row label="補助率">
          {s.benefit_rate_percent != null ? `${s.benefit_rate_percent}%` : null}
        </Row>
        <Row label="対象経費">
          {s.eligible_expense_categories?.join('、') ?? null}
        </Row>
        <Row label="採択枠">
          {s.selection_quota != null ? `${s.selection_quota}件` : null}
        </Row>
        <Row label="段階金額">
          {s.benefit_tiers && s.benefit_tiers.length > 0 ? (
            <ul className="space-y-1">
              {s.benefit_tiers.map((t, i) => (
                <li key={`${t.condition_label}-${i}`}>
                  <span className="text-subink">［{t.condition_type}］</span>{' '}
                  {t.condition_label} —{' '}
                  {t.amount_yen != null ? formatYen(t.amount_yen) : ''}
                  {t.rate_percent != null ? `（補助率 ${t.rate_percent}%）` : ''}
                  {t.note && <span className="text-subink">（{t.note}）</span>}
                </li>
              ))}
            </ul>
          ) : null}
        </Row>
        <Row label="現物品目">
          {s.goods_items && s.goods_items.length > 0 ? (
            <ul className="space-y-1">
              {s.goods_items.map((g, i) => (
                <li key={`${g.item_name}-${i}`}>
                  {g.item_name}
                  {g.quantity_note && (
                    <span className="text-subink">（{g.quantity_note}）</span>
                  )}
                  {g.stock_limited && (
                    <span className="ml-1 rounded-sm bg-accent-soft px-1.5 py-0.5 text-xs text-accent">
                      数量限定
                    </span>
                  )}
                  {g.note && <span className="text-subink">（{g.note}）</span>}
                </li>
              ))}
            </ul>
          ) : null}
        </Row>
      </Section>

      {/* 申請 */}
      <Section title="申請">
        <Row label="期限の性質">{s.application_window_type}</Row>
        <Row label="期限の補足">{s.application_window_note}</Row>
        <Row label="受付開始">{formatDate(s.application_start)}</Row>
        <Row label="受付締切">{formatDate(s.application_end)}</Row>
        <Row label="申請方法">{s.application_method}</Row>
        <Row label="必要書類">
          {s.required_documents && s.required_documents.length > 0 ? (
            <ul className="list-disc pl-5">
              {s.required_documents.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
        </Row>
        <Row label="募集回">
          {s.application_rounds && s.application_rounds.length > 0 ? (
            <ul className="space-y-1">
              {s.application_rounds.map((r) => (
                <li key={r.round_number}>
                  第{r.round_number}回: {formatDate(r.start_date) ?? '—'} 〜{' '}
                  {formatDate(r.end_date) ?? '—'}
                  {r.note && <span className="text-subink">（{r.note}）</span>}
                </li>
              ))}
            </ul>
          ) : null}
        </Row>
      </Section>

      {/* ステータス */}
      {s.status_note && (
        <Section title="ステータス補足">
          <Row label="補足">{s.status_note}</Row>
        </Section>
      )}

      {/* 関連制度 */}
      {s.related_programs && s.related_programs.length > 0 && (
        <Section title="関連する制度">
          {s.related_programs.map((rel, i) => (
            <Row key={`${rel.program_name}-${i}`} label={rel.relation_type}>
              {rel.related_subsidy_id ? (
                <Link
                  href={`/subsidies/${rel.related_subsidy_id}`}
                  className="text-accent hover:underline"
                >
                  {rel.program_name}
                </Link>
              ) : (
                rel.program_name
              )}
              {rel.note && (
                <span className="text-subink">（{rel.note}）</span>
              )}
            </Row>
          ))}
        </Section>
      )}

      {/* 連絡先 & 出典 */}
      <Section title="連絡先・出典">
        <Row label="連絡先">{s.contact}</Row>
        <Row label="出典">
          <a
            href={s.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-accent hover:underline"
          >
            {s.source_url}
          </a>
        </Row>
      </Section>

      <p className="mt-8 text-xs text-subink">
        ※ 掲載内容は抽出時点のものです。申請前に必ず出典元の公式情報をご確認ください。
      </p>
    </article>
  );
}
