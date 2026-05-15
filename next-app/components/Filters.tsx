'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PREFECTURE_GROUPS, NATIONAL_BODIES } from '@/lib/bodies';
import { CATEGORIES, STATUSES } from '@/lib/constants';

/**
 * 一覧ページのフィルタ。状態は URL クエリに持たせ、
 * サーバーコンポーネント側の再フェッチに任せる。
 */
export function Filters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(params.get('q') ?? '');

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    sp.delete('cursor'); // フィルタ変更時はページングをリセット
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q });
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex-1">
          <span className="text-xs text-subink">キーワード</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="制度名・要約を検索"
            className="mt-1 w-full rounded-sm border border-line bg-white px-3 py-2 text-sm"
          />
        </label>

        <label>
          <span className="text-xs text-subink">カテゴリ</span>
          <select
            value={params.get('category') ?? ''}
            onChange={(e) => apply({ category: e.target.value })}
            className="mt-1 w-full rounded-sm border border-line bg-white px-3 py-2 text-sm sm:w-44"
          >
            <option value="">すべて</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs text-subink">自治体</span>
          <select
            value={params.get('body') ?? ''}
            onChange={(e) => apply({ body: e.target.value })}
            className="mt-1 w-full rounded-sm border border-line bg-white px-3 py-2 text-sm sm:w-40"
          >
            <option value="">すべて</option>
            {NATIONAL_BODIES.length > 0 && (
              <optgroup label="国・全国">
                {NATIONAL_BODIES.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            )}
            {PREFECTURE_GROUPS.map((g) => (
              <optgroup key={g.prefecture.code} label={g.prefecture.name}>
                <option value={g.prefecture.code}>
                  {g.prefecture.name}（全域）
                </option>
                {g.members.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs text-subink">状態</span>
          <select
            value={params.get('status') ?? ''}
            onChange={(e) => apply({ status: e.target.value })}
            className="mt-1 w-full rounded-sm border border-line bg-white px-3 py-2 text-sm sm:w-32"
          >
            <option value="">募集中・予定・通年</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-sm bg-ink px-5 py-2 text-sm text-paper hover:bg-accent disabled:opacity-50"
        >
          {isPending ? '…' : '検索'}
        </button>
      </form>

      <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-line pt-3 text-sm text-subink">
        <input
          type="checkbox"
          checked={params.get('verified') === 'true'}
          onChange={(e) => apply({ verified: e.target.checked ? 'true' : '' })}
          className="h-4 w-4 accent-accent"
        />
        <span>
          人手確認済みのみ表示
          <span className="ml-1 text-xs">
            （β期間中、未確認データには「自動収集」と表示）
          </span>
        </span>
      </label>
    </div>
  );
}
