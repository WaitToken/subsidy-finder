import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubsidyCard } from '@/components/SubsidyCard';
import { DbNotice } from '@/components/DbNotice';
import { AudienceTabs } from '@/components/AudienceTabs';
import { BODIES, PREFECTURE_GROUPS } from '@/lib/bodies';
import { getSubsidies, getBodySubsidyCounts, type Audience } from '@/lib/queries';
import type { Subsidy } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AreaPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const audience: Audience = sp.audience === 'business' ? 'business' : 'individual';

  const body = BODIES.find((b) => b.code === code);
  if (!body) notFound();

  let subsidies: Subsidy[] = [];
  let counts = new Map<string, number>();
  let dbError: string | null = null;
  try {
    [subsidies, counts] = await Promise.all([
      getSubsidies({ body: code, audience, limit: 100 }),
      getBodySubsidyCounts(audience),
    ]);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const isPrefecture = body.type === 'prefecture';
  const group = PREFECTURE_GROUPS.find((g) => g.prefecture.code === body.prefecture);
  const members = isPrefecture ? group?.members ?? [] : [];

  return (
    <div>
      {/* パンくず */}
      <nav className="text-sm text-subink">
        <Link href={`/areas?audience=${audience}`} className="hover:text-accent">
          地域から探す
        </Link>
        {!isPrefecture && group && (
          <>
            {' / '}
            <Link
              href={`/areas/${group.prefecture.code}?audience=${audience}`}
              className="hover:text-accent"
            >
              {group.prefecture.name}
            </Link>
          </>
        )}
        {' / '}
        <span className="text-ink">{body.name}</span>
      </nav>

      <header className="mt-3 border-b border-line pb-6">
        <h1 className="font-serif text-3xl">{body.name}の補助金・助成金</h1>
        <p className="mt-2 text-sm text-subink">
          {isPrefecture
            ? `${body.name}が実施する制度です。市区町村独自の制度は下の一覧から。`
            : `${body.name}が実施する制度です。`}
        </p>
        <div className="mt-4">
          <AudienceTabs
            basePath={`/areas/${code}`}
            current={audience}
          />
        </div>
      </header>

      {/* 市区町村ナビ (都道府県ページのみ) */}
      {isPrefecture && members.length > 0 && (
        <section className="mt-6">
          <h2 className="section-rule font-serif text-lg">市区町村で絞り込む</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {members.map((m) => (
              <Link
                key={m.code}
                href={`/areas/${m.code}?audience=${audience}`}
                className="rounded-full border border-line bg-panel px-3 py-1 text-sm hover:border-accent"
              >
                {m.name}
                <span className="ml-1 text-xs text-subink">
                  {counts.get(m.code) ?? 0}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 制度一覧 */}
      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">
          {body.name}の制度
          <span className="ml-2 text-sm font-sans text-subink">
            {subsidies.length}件
          </span>
        </h2>
        {dbError ? (
          <div className="mt-4">
            <DbNotice detail={dbError} />
          </div>
        ) : subsidies.length === 0 ? (
          <p className="mt-4 text-sm text-subink">
            まだ{body.name}の制度は登録されていません。
            クロール展開が進むと表示されます。
          </p>
        ) : (
          <div className="mt-4 grid gap-4">
            {subsidies.map((s) => (
              <SubsidyCard key={s.id} subsidy={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
