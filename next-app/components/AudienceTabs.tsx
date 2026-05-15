import Link from 'next/link';
import { AUDIENCE_TABS } from '@/lib/constants';
import type { Audience } from '@/lib/queries';

/**
 * 個人向け / 事業者向け の対等タブ。
 * 現在の URL クエリを引き継ぎつつ audience だけ切り替える (リンクベース)。
 */
export function AudienceTabs({
  basePath,
  current,
  params,
}: {
  basePath: string;
  current: Audience;
  params?: Record<string, string | undefined>;
}) {
  function href(value: string): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v && k !== 'audience' && k !== 'cursor') sp.set(k, v);
    }
    sp.set('audience', value);
    return `${basePath}?${sp.toString()}`;
  }

  return (
    <div className="inline-flex rounded-md border border-line bg-panel p-1">
      {AUDIENCE_TABS.map((tab) => {
        const active = tab.value === current;
        return (
          <Link
            key={tab.value}
            href={href(tab.value)}
            aria-current={active ? 'page' : undefined}
            className={`rounded px-6 py-1.5 font-serif text-sm transition-colors ${
              active
                ? 'bg-ink text-paper'
                : 'text-subink hover:text-accent'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
