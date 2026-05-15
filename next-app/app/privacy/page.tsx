import Link from 'next/link';

export const metadata = {
  title: 'プライバシーポリシー | 補助金ファインダー',
};

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl text-sm leading-relaxed">
      <h1 className="font-serif text-3xl">プライバシーポリシー</h1>
      <p className="mt-2 text-xs text-subink">最終更新: 2026年5月</p>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">取得する情報</h2>
        <p className="mt-3">
          当サイトは現在、ユーザー登録機能を提供していません。以下の情報のみを扱います。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>30秒診断の入力内容</strong> —
            居住自治体・世帯区分・年齢・関心テーマ。診断結果の生成にのみ使用し、
            <strong>サーバーには保存しません</strong>。ブラウザを閉じれば失われます
          </li>
          <li>
            <strong>サーバーアクセスログ</strong> —
            IP アドレス・User-Agent・閲覧 URL を運用上記録する場合があります
            （セキュリティと不具合調査の目的）
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">第三者提供</h2>
        <p className="mt-3">
          ユーザーの入力情報を第三者に提供することはありません。
        </p>
      </section>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">Cookie・トラッキング</h2>
        <p className="mt-3">
          当サイトは <strong>Vercel Web Analytics</strong> および
          <strong>Vercel Speed Insights</strong> を利用してページビュー数・
          パフォーマンス指標を計測しています。
          いずれも <strong>Cookie を使用せず、個人を特定できる情報も収集しません</strong>
          （集計値のみを Vercel のダッシュボードで確認できる仕組み）。
          詳細は{' '}
          <a
            href="https://vercel.com/docs/analytics/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Vercel Analytics のプライバシーポリシー
          </a>
          {' '}を参照してください。
        </p>
        <p className="mt-3">
          広告 Cookie は使用していません。
        </p>
      </section>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">外部サイトへのリンク</h2>
        <p className="mt-3">
          各制度詳細ページから自治体公式サイトへのリンクを提供しています。
          リンク先のプライバシー取扱いは当サイトの責任範囲外です。
        </p>
      </section>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">お問い合わせ</h2>
        <p className="mt-3">
          本ポリシーに関するご質問は{' '}
          <Link href="/contact" className="text-accent hover:underline">
            お問い合わせ
          </Link>
          {' '}までお願いします。
        </p>
      </section>
    </article>
  );
}
