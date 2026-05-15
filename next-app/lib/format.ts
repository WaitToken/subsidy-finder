// ============================================================
// 表示用フォーマッタ
// ============================================================

/** 円 → 「40万円」「1,500円」。null はそのまま null。 */
export function formatYen(yen: number | null | undefined): string | null {
  if (yen == null) return null;
  if (yen >= 10000) {
    const man = yen / 10000;
    const label = Number.isInteger(man) ? String(man) : man.toFixed(1);
    return `${label}万円`;
  }
  return `${yen.toLocaleString('ja-JP')}円`;
}

/** ISO 日付文字列 → 「2026年6月1日」。パース不能ならそのまま返す。 */
export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 締切までの残日数。過ぎていれば負の数、日付が無ければ null。 */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - startOfToday.getTime()) / 86_400_000);
}

/** 締切の緊急度ラベル。「あと3日」「本日締切」「締切終了」など。 */
export function deadlineLabel(iso: string | null | undefined): string | null {
  const days = daysUntil(iso);
  if (days == null) return null;
  if (days < 0) return '締切終了';
  if (days === 0) return '本日締切';
  if (days <= 30) return `あと${days}日`;
  return formatDate(iso);
}
