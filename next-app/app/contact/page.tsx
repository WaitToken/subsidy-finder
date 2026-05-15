export const metadata = {
  title: 'お問い合わせ・削除依頼 | 補助金ファインダー',
};

export default function ContactPage() {
  // 連絡先は環境変数で運用 (本番では実アドレスを設定)
  const email = process.env.CONTACT_EMAIL ?? 'contact@example.com';

  return (
    <article className="max-w-2xl">
      <h1 className="font-serif text-3xl">お問い合わせ・削除依頼</h1>

      <p className="mt-4 text-sm leading-relaxed text-ink">
        以下のいずれの内容も、メールでご連絡ください。
        通常、平日3営業日以内にお返事します（β期間中は遅れる場合があります）。
      </p>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">連絡先</h2>
        <p className="mt-3">
          <a
            href={`mailto:${email}`}
            className="font-mono text-accent hover:underline"
          >
            {email}
          </a>
        </p>
      </section>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">想定する用途</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <strong>掲載内容の誤り・古い情報の指摘</strong> —
            該当ページの URL と、修正してほしい点をお知らせください
          </li>
          <li>
            <strong>自治体の方からの掲載停止・修正依頼</strong> —
            ご所属と該当 URL を明記いただければ、原則1営業日以内に対応します
          </li>
          <li>
            <strong>クローラーの挙動についてのご連絡</strong> —
            アクセス頻度・User-Agent の調整等、お知らせください
          </li>
          <li>
            <strong>サービスへのご意見・機能要望</strong>
          </li>
          <li><strong>取材・連携のご相談</strong></li>
        </ul>
      </section>

      <section className="mt-8 rounded-md border border-line bg-panel p-4 text-sm">
        <h3 className="font-serif">メールに記載いただきたいこと</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>件名（例: 「掲載内容の修正依頼」「掲載停止依頼」）</li>
          <li>該当ページの URL</li>
          <li>具体的なご要望</li>
          <li>差し支えなければお名前・ご所属</li>
        </ul>
      </section>
    </article>
  );
}
