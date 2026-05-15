# 補助金ファインダー — Full Stack PoC

全国の自治体（47都道府県＋政令指定都市20＋東京23特別区＝90自治体）が出している
補助金・助成金を、クローラー＋LLMで構造化し、一般生活者向けにわかりやすく
提供するサービスのフルスタック PoC。

自治体マスタの single source of truth は `data/seeds.yaml`。
ここから DB（`db/load_bodies.py`）・クローラー（`src/run.py`）・
フロントの自治体一覧（`scripts/gen_bodies.py` → `next-app/lib/bodies.ts`）を駆動する。

## 全体アーキテクチャ

```
┌─────────────────┐  クロール       ┌──────────────┐
│  自治体公式サイト  │ ──────────►  │  Crawler     │
│  (24自治体)       │                │  + Extractor │
└─────────────────┘                 └──────┬───────┘
                                            │ JSON
                                            ▼
                                    ┌────────────────┐
                                    │   PostgreSQL   │ ◄──── eval (精度測定)
                                    │   (v0.3 schema)│
                                    └────────┬───────┘
                                             │
                                    ┌────────▼──────────┐
                                    │  Next.js API      │
                                    │  /api/subsidies   │
                                    │  /api/diagnose    │
                                    └────────┬──────────┘
                                             │
                                    ┌────────▼──────────┐
                                    │  React UI         │
                                    │  (editorial日本誌風)│
                                    └───────────────────┘
```

## ディレクトリ構成

```
tokyo-subsidy-poc/
├── src/                     # Python: 抽出パイプライン
│   ├── schema.py            # Pydantic スキーマ (v0.3)
│   ├── crawler.py           # httpx + trafilatura
│   ├── extractor.py         # Claude Sonnet 4.6 + tool use
│   └── run.py               # 一連の実行
├── eval/                    # 精度評価
│   ├── ground_truth.json    # 手動正解データ (現在8件、目標100件)
│   └── evaluate.py          # Recall・Precision・カテゴリ別測定
├── db/                      # PostgreSQL
│   ├── schema.sql           # DDL (v0.4)
│   ├── load_bodies.py       # seeds.yaml → operating_bodies ローダー
│   └── migrate_from_json.py # JSON → DB ローダー
├── next-app/                # Next.js フロントエンド
│   ├── app/api/
│   │   ├── subsidies/route.ts        # 一覧
│   │   ├── subsidies/[id]/route.ts   # 詳細
│   │   └── diagnose/route.ts         # 診断マッチング
│   ├── lib/
│   │   ├── db.ts            # postgres.js コネクション
│   │   └── types.ts         # TypeScript 型 (Pydantic と1:1)
│   └── package.json
├── data/
│   ├── seeds.yaml           # 自治体マスタ兼シードURL (90自治体・single source of truth)
│   └── extracted/           # JSON 出力
├── scripts/
│   ├── gen_bodies.py        # seeds.yaml → next-app/lib/bodies.ts 再生成
│   └── check_seeds.py       # seeds.yaml の url 疎通チェック
├── docker-compose.yml       # ローカル開発環境
└── README.md
```

## ローカル起動

```bash
# 1. DB 起動 (schema は自動適用)
docker compose up -d db

# 2. 自治体マスタを投入 (seeds.yaml → operating_bodies)
export DATABASE_URL=postgresql://dev:dev@localhost:5432/tokyo_subsidy
pip install psycopg[binary]
python -m db.load_bodies --seeds data/seeds.yaml

# 3. 既存の抽出 JSON を DB へロード
python -m db.migrate_from_json --extracted data/extracted

# 4. Next.js 起動 (lib/bodies.ts は seeds.yaml から再生成可)
python scripts/gen_bodies.py
cd next-app && npm install && npm run dev
# → http://localhost:3000

# 5. 抽出パイプライン (新規ページの取り込み)
export ANTHROPIC_API_KEY=sk-ant-...
cd .. && python -m src.run --seeds data/seeds.yaml --limit-sources 5

# 6. 精度評価
python -m eval.evaluate --truth eval/ground_truth.json --extracted data/extracted

# seeds.yaml の url 疎通チェック (任意)
python scripts/check_seeds.py
```

## API

### `GET /api/subsidies`

一覧取得。クエリ:
- `category`: 「住まい」「子育て・教育」など
- `body`: 自治体コード (例: `setagaya`)
- `status`: 「募集中」「予定」「通年」「終了」
- `q`: フルテキスト検索 (program_name + plain_summary)
- `limit`, `cursor`: ページング

### `GET /api/subsidies/[id]`

詳細。`application_rounds` と `related_programs` をネストして返す。

### `POST /api/diagnose`

診断マッチング。リクエスト:
```json
{
  "ward": "setagaya",
  "household": "family_young",
  "child_age": 3,
  "interests": ["housing", "childcare"]
}
```

レスポンス:
```json
{
  "matched":  [{ "subsidy": {...}, "match_score": 85, "match_reasons": ["世田谷区在住者向け", "家族構成が合致"] }],
  "partial":  [...],
  "total_evaluated": 47
}
```

スコアリング: 居住区(40) + 家族構成(30) + 子の年齢(20) + 関心(15) + 本人年齢(15)。30点以上で `matched`。

## スキーマ進化

| 版    | 追加内容                                              | 検証元                       |
|-------|----------------------------------------------------|----------------------------|
| v0.1  | 基本10フィールド                                     | 設計時                      |
| v0.2  | 給付形態 / 期限の性質 / 状態補足 / 制度間関係            | 世田谷区「ずっと、世田谷。」      |
| v0.3  | 経費補助率(%) / 対象経費 / 複数回募集 / 採択枠           | 東京都「令和8年度創業助成事業」  |
| v0.4  | 段階金額 (車種別・所得別) / 現物給付の品目・在庫限定      | スキーマ設計 (実データ検証は今後) |

各版は実データ検証で発見した穴を埋める形で進化。
v0.4 は `benefit_tiers` (条件で段階的に変わる金額: EV補助の車種別・高校学費助成の所得別) と
`goods_items` (出産用品配布などの現物品目・数量限定フラグ) を追加。
子育て・環境カテゴリの実データ検証でフィールド定義を確定させる予定。

## 精度評価

```
============================================================
  Tokyo Subsidy Extractor — 精度評価レポート
============================================================

Ground Truth: 8件
【再現率 Recall】 3/8 = 37.5%

【フィールド別精度】(抽出できた制度のうち)
  program_name             100.0%  ████████████████████  (n=3)
  operating_body           100.0%  ████████████████████  (n=3)
  category                 100.0%  ████████████████████  (n=3)
  benefit_type             100.0%  ████████████████████  (n=3)
  ...
```

GT を 100件まで増やせば、推出パイプラインの真の精度が見える。
GT 増加は世田谷区パターンを他自治体・他カテゴリに展開しながら作る。

## コスト

抽出: $0.04/ページ × 1,200ページ = **約$48 (初回フル)**
週次差分更新: **月約$20**

Postgres (Supabase Free / Neon Free) と Vercel Hobby で **インフラ実質$0** からスタート可。

## 次のマイルストーン

1. **GT 100件作成** — 自動評価の信頼性を確立
2. **残り21自治体に展開** — 世田谷の抽出ロジックを横展開
3. **ユーザー認証 + ブックマーク** — Next.js Auth.js
4. **LINE 連携** — 締切通知 + マッチ条件変更時のプッシュ
5. **多言語化 (英・中・韓)** — 外国人居住者60万人にリーチ
