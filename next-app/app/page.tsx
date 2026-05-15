import Link from 'next/link';
import { DiagnoseForm } from '@/components/DiagnoseForm';
import { getCategoryCounts, type CategoryCount } from '@/lib/queries';
import { CATEGORIES } from '@/lib/constants';

// 抽出データは随時更新されるため毎リクエストで取得する
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let counts: CategoryCount[] = [];
  try {
    counts = await getCategoryCounts();
  } catch {
    // DB 未起動でもトップページ自体は表示する (診断は実行時にエラー表示)
    counts = [];
  }
  const countByCategory = new Map(counts.map((c) => [c.category, c.count]));
  const total = counts.reduce((sum, c) => sum + c.count, 0);

  return (
    <div>
      {/* ヒーロー */}
      <section className="border-b border-line pb-10">
        <p className="text-sm tracking-wide text-accent">
          全国 47都道府県 ＋ 政令指定都市 ＋ 東京23区
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
          使える補助金を、
          <br className="hidden sm:block" />
          まとめて探す。
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-subink">
          全国の自治体が出している補助金・助成金を、
          <strong className="text-ink">個人向けも事業者向けも対等に</strong>
          、構造化して集めました。
          「○○Payで10万円分」のような給付の中身や、補助率・対象経費・段階金額まで、わかりやすくお見せします。
          {total > 0 && (
            <>
              {' '}
              現在 <span className="font-bold text-ink">{total}件</span>{' '}
              の制度を掲載中。
            </>
          )}
        </p>
      </section>

      {/* 30秒診断 (個人向け) */}
      <section className="mt-10">
        <div className="flex items-baseline gap-3">
          <h2 className="section-rule font-serif text-xl">30秒診断</h2>
          <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
            個人向け
          </span>
        </div>
        <p className="mt-2 text-sm text-subink">
          わかる範囲で選ぶだけ。すべて任意です。
          事業者の方は{' '}
          <Link
            href="/subsidies?audience=business"
            className="text-accent hover:underline"
          >
            事業者向け制度一覧
          </Link>
          {' '}か{' '}
          <Link
            href="/areas?audience=business"
            className="text-accent hover:underline"
          >
            地域から探す
          </Link>
          {' '}をご利用ください。
        </p>
        <div className="mt-5">
          <DiagnoseForm />
        </div>
      </section>

      {/* カテゴリから探す */}
      <section className="mt-14">
        <h2 className="section-rule font-serif text-xl">カテゴリから探す</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => {
            const count = countByCategory.get(category);
            return (
              <Link
                key={category}
                href={`/subsidies?category=${encodeURIComponent(category)}`}
                className="flex items-center justify-between rounded-md border border-line bg-panel px-4 py-3 hover:border-accent"
              >
                <span className="font-serif">{category}</span>
                <span className="text-sm text-subink">
                  {count != null ? `${count}件` : '—'}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/areas" className="text-sm text-accent hover:underline">
            地域（都道府県・市区町村）から探す →
          </Link>
          <Link
            href="/subsidies"
            className="text-sm text-accent hover:underline"
          >
            すべての制度を一覧で見る →
          </Link>
        </div>
      </section>
    </div>
  );
}
