import type { MetadataRoute } from 'next';

/**
 * β期間中は noindex。データ品質と自治体への配慮を優先し、
 * 本公開（人手確認の比率を上げてから）まで検索エンジンには載せない。
 *
 * 本公開時は disallow を消すか、`Allow: '/'` に変更すること。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
  };
}
