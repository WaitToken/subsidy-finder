# Deploy ガイド

本番公開の手順。Vercel + Supabase + GitHub Actions の3点セットを想定。

> **β期間中は noindex で公開**（`app/robots.ts` で `Disallow: /`、メタも `robots: noindex`）。
> データ品質が固まってから本公開（noindex を外す）に移行する。

---

## 0. 事前に用意するもの

- GitHub アカウント
- Vercel アカウント（GitHub サインアップ可）
- Supabase アカウント（GitHub サインアップ可）
- Anthropic API キー（クロール用、`console.anthropic.com`）
- 連絡先メール（自治体問い合わせ受け窓口。Gmail+alias 推奨。例: `youraddress+subsidy@gmail.com`）
- 独自ドメイン（任意。当面は `*.vercel.app` で OK）

---

## 1. GitHub に push

ローカルで実行:

```bash
cd /Users/geuntaekoh/Downloads/tokyo-subsidy-poc
git init
git add .
git commit -m "feat: initial public-ready PoC"

# GitHub に空リポジトリを作って remote 追加
gh repo create subsidy-finder --public --source=. --remote=origin --push
# あるいは GitHub Web で作って:
# git remote add origin git@github.com:YOUR_USER/subsidy-finder.git
# git push -u origin main
```

`.env`・`.venv`・`node_modules`・`.next` は `.gitignore` で除外済み。

---

## 2. Supabase プロジェクト作成 + スキーマ適用

1. [supabase.com](https://supabase.com) で New Project（リージョン: **Tokyo (ap-northeast-1)**）
2. Settings → Database → Connection string の **URI** をコピー
   （`postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`）
3. ローカルから一気に投入:

```bash
export DATABASE_URL='postgresql://postgres:...@db.xxx.supabase.co:5432/postgres'

# スキーマ適用
psql "$DATABASE_URL" -f db/schema.sql

# 自治体マスタ投入（90自治体）
.venv/bin/python -m db.load_bodies --seeds data/seeds.yaml

# 抽出済み JSON を投入
.venv/bin/python -m db.migrate_from_json --extracted data/extracted
```

4. Settings → Database → **Backups** で Daily Backups を ON
5. Settings → API → Service Role キーは Vercel には**渡さない**（不要）。`DATABASE_URL` のみ使う

---

## 3. Vercel デプロイ

1. [vercel.com](https://vercel.com) → New Project → GitHub リポジトリを選択
2. **Root Directory**: `next-app` を指定（重要）
3. Framework Preset: Next.js（自動検出）
4. **Environment Variables**:
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Supabase の connection string（手順2でコピーしたもの） |
   | `CONTACT_EMAIL` | 連絡先メール（例: `you+subsidy@gmail.com`） |
5. Deploy → 数分で `https://your-project.vercel.app` が払い出される

> Vercel free (Hobby) で十分。トラフィックが伸びたら Pro $20/月。

---

## 4. クロールの定期実行（GitHub Actions）

1. GitHub リポジトリ → Settings → Secrets and variables → Actions に追加:
   | Secret | 値 |
   |---|---|
   | `ANTHROPIC_API_KEY` | `sk-ant-...` |
   | `DATABASE_URL` | Supabase の URI（手順2と同じ） |
   | `CONTACT_EMAIL` | 連絡先メール |
2. 初回は手動テスト: Actions タブ → "Weekly nationwide crawl" → Run workflow
   - `skip_sources=47, limit_sources=2` 程度の小規模で動作確認 → 全件
3. 安定したら `.github/workflows/crawl.yml` の `schedule:` のコメントを外す
   - 既定は Sunday 18:00 UTC（= Monday 03:00 JST）

---

## 5. Anthropic コスト管理

`console.anthropic.com` → **Plans & Billing → Spend Limits** に月予算を設定（例 $50 / $100）。
警告と自動停止のしきい値を分けて設定すると安全。

参考コスト:
- 全国 67自治体・初回フル: ~$150
- 週次差分（変更ページのみ）: ~$20/月

---

## 6. 本公開（noindex 解除）の判断基準

以下が揃ったら β を外し、`app/robots.ts` の `disallow` 削除＋ `app/layout.tsx` の `robots: { index: true }` に変更:

- [ ] `verified=true` の制度が 100件以上
- [ ] 週次クロールが3週連続で破綻なく回っている
- [ ] 自治体からの苦情ゼロ（または対応済み）
- [ ] プライバシー / 利用規約に問題が見つかっていない

---

## 7. 公開後の運用

| 頻度 | 作業 |
|---|---|
| 週次（自動） | クロール → DB 更新（Actions） |
| 月次 | コスト確認、Sentry 等のエラーレポート確認 |
| 随時 | 削除依頼・修正依頼の対応（`/contact` 経由） |
| 四半期 | スキーマ改善・新カテゴリ追加（v0.6→） |
