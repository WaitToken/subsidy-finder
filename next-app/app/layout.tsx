import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '補助金ファインダー',
  description:
    '全国の自治体（47都道府県＋政令市＋特別区）の補助金・助成金を、個人向け・事業者向けの両方から探せる検索サービス。',
  // β期間中は検索エンジン非掲載 (本公開時に外す)
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-paper text-ink">
        <header className="border-b border-line bg-panel/60">
          <div className="mx-auto flex max-w-content items-baseline justify-between px-6 py-5">
            <Link
              href="/"
              className="flex items-baseline gap-2 font-serif text-xl tracking-tight hover:text-accent"
            >
              補助金ファインダー
              <span className="rounded-sm bg-accent px-1.5 py-0.5 font-sans text-[10px] font-bold leading-none text-paper">
                β
              </span>
            </Link>
            <nav className="flex gap-6 text-sm text-subink">
              <Link href="/" className="hover:text-accent">
                30秒診断
              </Link>
              <Link href="/areas" className="hover:text-accent">
                地域から探す
              </Link>
              <Link href="/subsidies" className="hover:text-accent">
                制度一覧
              </Link>
            </nav>
          </div>
          {/* β版 全幅の注意バー */}
          <div className="border-t border-amber-200 bg-amber-50 text-xs text-amber-900">
            <div className="mx-auto max-w-content px-6 py-2">
              <strong>β版</strong> ・
              掲載情報は自動収集した時点のものです。申請前に必ず各自治体の公式サイトで最新情報をご確認ください。
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-content px-6 py-10">{children}</main>

        <footer className="mt-16 border-t border-line">
          <div className="mx-auto max-w-content px-6 py-8">
            <p className="text-sm leading-relaxed text-ink">
              全国の自治体が出している補助金・助成金（個人向け・事業者向け）の検索サービス（β版）。
              情報は各自治体の公式サイトを構造化したものです。
              <strong>掲載内容の正確性は保証されません</strong> —
              申請判断は必ず公式情報を元に行ってください。
            </p>
            <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-subink">
              <Link href="/about" className="hover:text-accent">
                このサイトについて
              </Link>
              <Link href="/contact" className="hover:text-accent">
                お問い合わせ・削除依頼
              </Link>
              <Link href="/privacy" className="hover:text-accent">
                プライバシーポリシー
              </Link>
              <Link href="/terms" className="hover:text-accent">
                利用規約
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
