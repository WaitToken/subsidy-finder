'use client';

import { DbNotice } from '@/components/DbNotice';

/**
 * ページ評価中の未捕捉エラー (DATABASE_URL 未設定など) のグローバル境界。
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <DbNotice detail={error.message} />
      <button
        onClick={reset}
        className="rounded-sm border border-line bg-panel px-4 py-2 text-sm hover:border-accent"
      >
        再読み込み
      </button>
    </div>
  );
}
