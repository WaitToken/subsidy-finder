import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="font-serif text-3xl">ページが見つかりません</h1>
      <p className="mt-3 text-sm text-subink">
        指定された制度は存在しないか、削除された可能性があります。
      </p>
      <Link
        href="/subsidies"
        className="mt-6 inline-block rounded-sm border border-line bg-panel px-5 py-2 text-sm hover:border-accent"
      >
        制度一覧へ
      </Link>
    </div>
  );
}
