import Link from 'next/link';
import type { Subsidy } from '@/lib/types';
import { formatYen, deadlineLabel, daysUntil, formatDate } from '@/lib/format';
import {
  StatusBadge,
  CategoryBadge,
  BenefitTypeBadge,
  AudienceBadge,
} from './Badge';

/**
 * 一覧・診断結果で使う制度カード。
 * score / reasons が渡されたら診断スコアを表示する。
 */
export function SubsidyCard({
  subsidy,
  score,
  reasons,
}: {
  subsidy: Subsidy;
  score?: number;
  reasons?: string[];
}) {
  const amount = formatYen(subsidy.benefit_amount_max_yen);
  // 締切は「募集中」のときだけ表示する。予定/通年は application_end が
  // 前年度の残骸のことがあり「締切終了」と誤表示されるため。
  const isOpen = subsidy.status === '募集中';
  const deadline = isOpen ? deadlineLabel(subsidy.application_end) : null;
  const days = isOpen ? daysUntil(subsidy.application_end) : null;
  const urgent = days != null && days >= 0 && days <= 14;

  return (
    <Link
      href={`/subsidies/${subsidy.id}`}
      className="group block rounded-md border border-line bg-panel p-5 hover:border-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-subink">{subsidy.body_name}</span>
          <AudienceBadge audience={subsidy.target_audience} />
          <CategoryBadge category={subsidy.category} />
        </div>
        <StatusBadge status={subsidy.status} />
      </div>

      <h3 className="mt-2 font-serif text-lg leading-snug text-ink group-hover:text-accent">
        {subsidy.program_name}
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-subink">
        {subsidy.plain_summary}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {amount && (
          <span className="font-serif text-base text-accent">最大 {amount}</span>
        )}
        <BenefitTypeBadge benefitType={subsidy.benefit_type} />
        {subsidy.benefit_rate_percent != null && (
          <span className="text-xs text-subink">
            補助率 {subsidy.benefit_rate_percent}%
          </span>
        )}
        {deadline && (
          <span className={`text-xs ${urgent ? 'font-bold text-accent' : 'text-subink'}`}>
            {deadline}
          </span>
        )}
      </div>

      {/* メタ情報: 抽出日 + 確認ステータス (透明性確保) */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-subink">
        {subsidy.extracted_at && (
          <span>更新 {formatDate(subsidy.extracted_at)}</span>
        )}
        {subsidy.verified ? (
          <span className="rounded-sm bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
            ✓ 人手確認済み
          </span>
        ) : (
          <span className="rounded-sm bg-amber-50 px-1.5 py-0.5 text-amber-800">
            自動収集（未確認）
          </span>
        )}
      </div>

      {score != null && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg text-accent">{score}</span>
            <span className="text-xs text-subink">マッチ度</span>
          </div>
          {reasons && reasons.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-subink">
              {reasons.map((r) => (
                <li key={r}>・{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Link>
  );
}
