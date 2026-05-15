import Link from 'next/link';
import { REGIONS } from '@/lib/regions';
import { PREFECTURE_GROUPS } from '@/lib/bodies';
import { getBodySubsidyCounts, type Audience } from '@/lib/queries';
import { AudienceTabs } from '@/components/AudienceTabs';

export const dynamic = 'force-dynamic';

export default async function AreasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const audience: Audience = sp.audience === 'business' ? 'business' : 'individual';

  let counts = new Map<string, number>();
  try {
    counts = await getBodySubsidyCounts(audience);
  } catch {
    counts = new Map();
  }

  // 都道府県 code → エリア全体の件数 (都道府県 + 配下の政令市・特別区)
  const areaTotal = new Map<string, number>();
  const prefByCode = new Map(
    PREFECTURE_GROUPS.map((g) => [g.prefecture.code, g.prefecture]),
  );
  for (const g of PREFECTURE_GROUPS) {
    let total = counts.get(g.prefecture.code) ?? 0;
    for (const m of g.members) total += counts.get(m.code) ?? 0;
    areaTotal.set(g.prefecture.code, total);
  }

  return (
    <div>
      <header className="border-b border-line pb-6">
        <h1 className="font-serif text-3xl">地域から探す</h1>
        <p className="mt-2 text-sm text-subink">
          都道府県を選ぶと、その地域の制度と市区町村に絞り込めます。件数は募集中・予定・通年の合計です。
        </p>
        <div className="mt-4">
          <AudienceTabs basePath="/areas" current={audience} />
        </div>
      </header>

      <div className="mt-8 space-y-10">
        {REGIONS.map((region) => (
          <section key={region.name}>
            <h2 className="section-rule font-serif text-lg">{region.name}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {region.prefectures.map((code) => {
                const pref = prefByCode.get(code);
                if (!pref) return null;
                const n = areaTotal.get(code) ?? 0;
                return (
                  <Link
                    key={code}
                    href={`/areas/${code}?audience=${audience}`}
                    className="flex items-center justify-between rounded-md border border-line bg-panel px-4 py-3 hover:border-accent"
                  >
                    <span className="font-serif">{pref.name}</span>
                    <span className="text-sm text-subink">{n}件</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
