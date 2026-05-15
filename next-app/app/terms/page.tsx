import Link from 'next/link';

export const metadata = {
  title: '利用規約 | 補助金ファインダー',
};

export default function TermsPage() {
  return (
    <article className="max-w-2xl text-sm leading-relaxed">
      <h1 className="font-serif text-3xl">利用規約</h1>
      <p className="mt-2 text-xs text-subink">最終更新: 2026年5月</p>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">1. サービス内容</h2>
        <p className="mt-3">
          当サイト（以下「本サービス」）は、全国の自治体が公開している
          補助金・助成金情報をクローラーと言語モデルで構造化し、
          検索可能な形で提供するβ版サービスです。
        </p>
      </section>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">2. 情報の正確性</h2>
        <p className="mt-3">
          本サービスは、掲載情報の正確性・完全性・最新性を
          <strong>一切保証しません</strong>。
          各制度の金額・期限・対象条件は、抽出時点と異なる場合があります。
          利用者は申請等の判断を行う前に、必ず該当する自治体の公式情報を
          ご自身で確認してください。
        </p>
      </section>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">3. 免責</h2>
        <p className="mt-3">
          本サービスの利用により利用者が被ったいかなる損害についても、
          サイト運営者は責任を負いません。
          外部リンク先の内容についても同様です。
        </p>
      </section>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">4. 出典の取扱い</h2>
        <p className="mt-3">
          各制度ページには元情報の出典 URL を明示しています。
          本サービスは、自治体公式情報の二次的な検索インデックスとして
          機能することを目的としており、自治体のロゴ・マーク・名称等の
          商標的利用は行いません。
        </p>
        <p className="mt-3">
          掲載停止・修正のご要望は{' '}
          <Link href="/contact" className="text-accent hover:underline">
            お問い合わせ
          </Link>
          {' '}よりご連絡ください。
        </p>
      </section>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">5. 禁止事項</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>本サービスの自動収集データを大量・継続的にスクレイピングする行為</li>
          <li>本サービス・各自治体公式サイトの運営を妨げる行為</li>
          <li>掲載情報を改変して再配布する行為（出典を保ったままの引用は可）</li>
          <li>その他、法令または公序良俗に反する行為</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="section-rule font-serif text-lg">6. 規約の変更</h2>
        <p className="mt-3">
          本規約は予告なく変更される場合があります。重要な変更がある場合は
          本ページで告知します。
        </p>
      </section>
    </article>
  );
}
