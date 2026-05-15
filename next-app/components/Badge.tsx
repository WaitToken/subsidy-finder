import type { Status, Category, BenefitType, TargetAudience } from '@/lib/types';

const STATUS_STYLES: Record<Status, string> = {
  募集中: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  予定: 'bg-sky-100 text-sky-800 border-sky-200',
  通年: 'bg-amber-100 text-amber-800 border-amber-200',
  終了: 'bg-stone-100 text-stone-400 border-stone-200',
  不明: 'bg-stone-100 text-stone-500 border-stone-200',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${STATUS_STYLES[status] ?? STATUS_STYLES['不明']}`}
    >
      {status}
    </span>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-sm border border-line bg-panel px-2 py-0.5 text-xs text-subink">
      {category}
    </span>
  );
}

const AUDIENCE_STYLES: Record<TargetAudience, string> = {
  個人: 'bg-sky-100 text-sky-800 border-sky-200',
  事業者: 'bg-violet-100 text-violet-800 border-violet-200',
  両方: 'bg-teal-100 text-teal-800 border-teal-200',
  不明: '',
};

const AUDIENCE_LABEL: Record<TargetAudience, string> = {
  個人: '個人向け',
  事業者: '事業者向け',
  両方: '個人・事業者',
  不明: '',
};

export function AudienceBadge({ audience }: { audience: TargetAudience }) {
  // 不明 はバッジを出さない (ノイズになるため)
  if (audience === '不明') return null;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${AUDIENCE_STYLES[audience]}`}
    >
      {AUDIENCE_LABEL[audience]}
    </span>
  );
}

export function BenefitTypeBadge({ benefitType }: { benefitType: BenefitType }) {
  // 現金以外は朱色で強調 (差別化ポイント: 給付の質を見せる)
  const isCash = benefitType === '現金';
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-sm px-2 py-0.5 text-xs ${
        isCash
          ? 'border border-line bg-panel text-subink'
          : 'bg-accent-soft text-accent'
      }`}
    >
      {benefitType}
    </span>
  );
}
