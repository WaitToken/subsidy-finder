import Link from 'next/link';

export const metadata = {
  title: 'このサイトについて | 補助金ファインダー',
};

export default function AboutPage() {
  return (
    <article className="max-w-2xl text-sm leading-relaxed">
      <h1 className="font-serif text-3xl">このサイトについて</h1>

      <p className="mt-4 leading-relaxed">
        全国の自治体（47都道府県・政令指定都市・東京23特別区）が出している
        個人向け・事業者向けの補助金・助成金を、各自治体の公式サイトから
        構造化して掲載しています。
      </p>

      <h2 className="section-rule mt-8 font-serif text-xl">特徴</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed">
        <li>
          <strong>個人向け・事業者向けの両方を対等に扱う</strong>。
          一覧・地域ページではタブで切替可能
        </li>
        <li>
          給付の中身（現金 / ポイント・電子マネー / 商品券 / サービス /
          現物）まで構造化
        </li>
        <li>段階金額（車種別の EV 補助、所得別の助成）や複数回募集にも対応</li>
        <li>30秒診断（個人向け）で居住地・世帯から候補を提示</li>
      </ul>

      <h2 className="section-rule mt-8 font-serif text-xl">情報収集の方法</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed">
        <li>
          各自治体公式サイトをクローラーで巡回（robots.txt 遵守、リクエスト間隔
          2秒以上）
        </li>
        <li>
          ページ本文を LLM（Claude Sonnet）で構造化抽出。スキーマで型を強制
        </li>
        <li>
          「人手確認済み」マークは目視確認したものだけ。それ以外は
          「自動収集（未確認）」と明示
        </li>
      </ul>

      <h2 className="section-rule mt-8 font-serif text-xl">免責</h2>
      <p className="mt-3 text-sm leading-relaxed">
        掲載情報は抽出時点のものです。金額・期限・対象条件は変更されている
        可能性があり、サイト運営者は内容の正確性・最新性を保証しません。
        申請の判断は必ず各自治体の公式情報を元に行ってください。
      </p>

      <p className="mt-8 text-sm">
        ご意見・削除依頼は{' '}
        <Link href="/contact" className="text-accent hover:underline">
          お問い合わせ
        </Link>{' '}
        までお願いします。
      </p>
    </article>
  );
}
