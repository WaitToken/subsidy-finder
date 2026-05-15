import Link from 'next/link';
import { Filters } from '@/components/Filters';
import { SubsidyCard } from '@/components/SubsidyCard';
import { DbNotice } from '@/components/DbNotice';
import { AudienceTabs } from '@/components/AudienceTabs';
import { getSubsidies, type SubsidyFilters, type Audience } from '@/lib/queries';
import type { Subsidy } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type SearchParams = { [key: string]: string | string[] | undefined };

function str(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

export default async function SubsidiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const cursor = str(sp.cursor);
  const audience: Audience =
    str(sp.audience) === 'business' ? 'business' : 'individual';
  const verifiedOnly = str(sp.verified) === 'true';
  const filters: SubsidyFilters = {
    category: str(sp.category),
    body: str(sp.body),
    status: str(sp.status),
    q: str(sp.q),
    audience,
    verifiedOnly,
    cursor: cursor ? Number(cursor) : undefined,
    limit: PAGE_SIZE,
  };

  let subsidies: Subsidy[] = [];
  let dbError: string | null = null;
  try {
    subsidies = await getSubsidies(filters);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  // 次ページ用リンク (現在のフィルタを引き継ぐ)
  let nextHref: string | null = null;
  if (subsidies.length === PAGE_SIZE) {
    const nextParams = new URLSearchParams();
    for (const key of ['category', 'body', 'status', 'q', 'audience', 'verified'] as const) {
      const v = str(sp[key]);
      if (v) nextParams.set(key, v);
    }
    nextParams.set('cursor', String(subsidies[subsidies.length - 1]!.id));
    nextHref = `/subsidies?${nextParams.toString()}`;
  }

  return (
    <div>
      <header className="border-b border-line pb-6">
        <h1 className="font-serif text-3xl">制度一覧</h1>
        <p className="mt-2 text-sm text-subink">
          全国の自治体の補助金・助成金。締切が近い順に表示しています。
        </p>
        <div className="mt-4">
          <AudienceTabs
            basePath="/subsidies"
            current={audience}
            params={{
              category: str(sp.category),
              body: str(sp.body),
              status: str(sp.status),
              q: str(sp.q),
              verified: str(sp.verified),
            }}
          />
        </div>
      </header>

      <div className="mt-6">
        <Filters />
      </div>

      {dbError ? (
        <div className="mt-8">
          <DbNotice detail={dbError} />
        </div>
      ) : subsidies.length === 0 ? (
        <p className="mt-10 text-sm text-subink">
          条件に合う制度が見つかりませんでした。フィルタを変更してお試しください。
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-subink">{subsidies.length}件を表示</p>
          <div className="mt-4 grid gap-4">
            {subsidies.map((s) => (
              <SubsidyCard key={s.id} subsidy={s} />
            ))}
          </div>
          {nextHref && (
            <div className="mt-8 text-center">
              <Link
                href={nextHref}
                className="inline-block rounded-sm border border-line bg-panel px-6 py-2 text-sm hover:border-accent"
              >
                次の{PAGE_SIZE}件 →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
